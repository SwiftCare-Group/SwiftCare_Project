package com.swiftcare.backend.auth;

import com.swiftcare.backend.auth.dto.AuthResponse;
import com.swiftcare.backend.auth.dto.ForgotPasswordRequest;
import com.swiftcare.backend.auth.dto.LoginRequest;
import com.swiftcare.backend.auth.dto.RegisterRequest;
import com.swiftcare.backend.auth.dto.ResetPasswordRequest;
import com.swiftcare.backend.auth.dto.StaffAuthResponse;
import com.swiftcare.backend.common.enums.Role;
import com.swiftcare.backend.common.enums.Tier;
import com.swiftcare.backend.common.exception.EmailAlreadyExistsException;
import com.swiftcare.backend.common.exception.UnauthorizedException;
import com.swiftcare.backend.common.security.JwtUtil;
import com.swiftcare.backend.consultation.Doctor;
import com.swiftcare.backend.consultation.DoctorRepository;
import com.swiftcare.backend.patient.Patient;
import com.swiftcare.backend.patient.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final PatientRepository patientRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final DoctorRepository doctorRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailService emailService;

    @Value("${app.password-reset.expiry-minutes:15}")
    private long passwordResetExpiryMinutes;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.getEmail());

        if (patientRepository.existsByEmailIgnoreCase(email)
                || doctorRepository.existsByEmailIgnoreCase(email)) {
            throw new EmailAlreadyExistsException(
                    "An account with this email already exists"
            );
        }

        Patient patient = Patient.builder()
                .name(request.getName().trim())
                .email(email)
                .phone(request.getPhone().trim())
                .dateOfBirth(request.getDateOfBirth())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .build();

        Patient saved = patientRepository.save(patient);

        String accessToken = jwtUtil.generateToken(
                saved.getEmail(),
                Role.PATIENT.name(),
                saved.getTier().name()
        );

        return buildPatientResponse(
                saved,
                accessToken,
                createPatientRefreshToken(saved)
        );
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        Patient patient = patientRepository
                .findByEmailIgnoreCaseAndIsDeletedFalse(
                        normalizeEmail(request.getEmail())
                )
                .orElseThrow(() -> new UnauthorizedException(
                        "Invalid email or password"
                ));

        if (!passwordEncoder.matches(
                request.getPassword(),
                patient.getPasswordHash()
        )) {
            throw new UnauthorizedException("Invalid email or password");
        }

        refreshTokenRepository.deleteByPatientId(patient.getId());

        String accessToken = jwtUtil.generateToken(
                patient.getEmail(),
                patient.getRole().name(),
                patient.getTier().name()
        );

        return buildPatientResponse(
                patient,
                accessToken,
                createPatientRefreshToken(patient)
        );
    }

    @Transactional
    public Object refresh(String refreshToken) {
        RefreshToken stored = findUsableRefreshTokenForUpdate(refreshToken);
        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        if (stored.getPatient() != null) {
            Patient patient = stored.getPatient();

            if (patient.isDeleted()) {
                throw new UnauthorizedException(
                        "This patient account is inactive"
                );
            }

            String accessToken = jwtUtil.generateToken(
                    patient.getEmail(),
                    patient.getRole().name(),
                    patient.getTier().name()
            );

            return buildPatientResponse(
                    patient,
                    accessToken,
                    createPatientRefreshToken(patient)
            );
        }

        Doctor doctor = stored.getDoctor();
        if (doctor == null || doctor.isDeleted()) {
            throw new UnauthorizedException(
                    "This staff account is inactive"
            );
        }

        String accessToken = jwtUtil.generateToken(
                doctor.getEmail(),
                doctor.getRole().name()
        );

        return buildStaffResponse(
                doctor,
                accessToken,
                createStaffRefreshToken(doctor)
        );
    }

    @Transactional
    public void logout(String refreshToken) {
        RefreshToken stored = refreshTokenRepository
                .findByToken(refreshToken)
                .orElseThrow(() -> new UnauthorizedException(
                        "Invalid refresh token"
                ));

        stored.setRevoked(true);
        refreshTokenRepository.save(stored);
    }

    @Transactional
    public StaffAuthResponse staffLogin(LoginRequest request) {
        Doctor doctor = doctorRepository
                .findByEmailIgnoreCaseAndIsDeletedFalse(
                        normalizeEmail(request.getEmail())
                )
                .orElseThrow(() -> new UnauthorizedException(
                        "Invalid email or password"
                ));

        if (!passwordEncoder.matches(
                request.getPassword(),
                doctor.getPasswordHash()
        )) {
            throw new UnauthorizedException("Invalid email or password");
        }

        refreshTokenRepository.deleteByDoctorId(doctor.getId());

        String accessToken = jwtUtil.generateToken(
                doctor.getEmail(),
                doctor.getRole().name()
        );

        return buildStaffResponse(
                doctor,
                accessToken,
                createStaffRefreshToken(doctor)
        );
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        String email = normalizeEmail(request.getEmail());

        Patient patient = patientRepository
                .findByEmailIgnoreCaseAndIsDeletedFalse(email)
                .orElse(null);

        // Return normally to avoid revealing whether an account exists.
        if (patient == null) {
            return;
        }

        passwordResetTokenRepository.deleteByPatientId(patient.getId());

        String token = UUID.randomUUID().toString();

        PasswordResetToken resetToken = PasswordResetToken.builder()
                .id(UUID.randomUUID())
                .patient(patient)
                .token(token)
                .expiresAt(
                        LocalDateTime.now()
                                .plusMinutes(passwordResetExpiryMinutes)
                )
                .used(false)
                .createdAt(LocalDateTime.now())
                .build();

        passwordResetTokenRepository.save(resetToken);
        emailService.sendPasswordResetEmail(patient.getEmail(), token);
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken resetToken =
                passwordResetTokenRepository.findByToken(request.getToken())
                        .orElseThrow(() -> new UnauthorizedException(
                                "Invalid or expired password reset token"
                        ));

        if (resetToken.isUsed()) {
            throw new UnauthorizedException(
                    "This password reset token has already been used"
            );
        }

        if (resetToken.isExpired()) {
            throw new UnauthorizedException(
                    "This password reset token has expired"
            );
        }

        Patient patient = resetToken.getPatient();
        if (patient == null || patient.isDeleted()) {
            throw new UnauthorizedException(
                    "This patient account is inactive"
            );
        }

        patient.setPasswordHash(
                passwordEncoder.encode(request.getNewPassword())
        );
        patientRepository.save(patient);

        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);

        refreshTokenRepository.deleteByPatientId(patient.getId());
    }

    private RefreshToken findUsableRefreshTokenForUpdate(String token) {
        RefreshToken stored = refreshTokenRepository.findForUpdateByToken(token)
                .orElseThrow(() -> new UnauthorizedException(
                        "Invalid refresh token"
                ));

        if (stored.isRevoked()) {
            throw new UnauthorizedException(
                    "Refresh token has been revoked"
            );
        }

        if (stored.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new UnauthorizedException(
                    "Refresh token has expired. Please log in again."
            );
        }

        return stored;
    }

    private String createPatientRefreshToken(Patient patient) {
        RefreshToken refreshToken = RefreshToken.builder()
                .patient(patient)
                .token(UUID.randomUUID().toString())
                .build();

        return refreshTokenRepository.save(refreshToken).getToken();
    }

    private String createStaffRefreshToken(Doctor doctor) {
        RefreshToken refreshToken = RefreshToken.builder()
                .doctor(doctor)
                .token(UUID.randomUUID().toString())
                .build();

        return refreshTokenRepository.save(refreshToken).getToken();
    }

    private AuthResponse buildPatientResponse(
            Patient patient,
            String accessToken,
            String refreshToken
    ) {
        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .patientId(patient.getId())
                .name(patient.getName())
                .email(patient.getEmail())
                .tier(patient.getTier())
                .build();
    }

    private StaffAuthResponse buildStaffResponse(
            Doctor doctor,
            String accessToken,
            String refreshToken
    ) {
        return StaffAuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .staffId(doctor.getId())
                .name(doctor.getName())
                .email(doctor.getEmail())
                .role(doctor.getRole())
                .build();
    }

    private String normalizeEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }

        return email.trim().toLowerCase(Locale.ROOT);
    }
}
