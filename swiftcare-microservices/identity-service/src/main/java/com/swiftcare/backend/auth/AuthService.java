package com.swiftcare.backend.auth;

import com.swiftcare.backend.auth.dto.AuthResponse;
import com.swiftcare.backend.auth.dto.LoginRequest;
import com.swiftcare.backend.auth.dto.RegisterRequest;
import com.swiftcare.backend.auth.dto.StaffAuthResponse;
import com.swiftcare.backend.common.enums.Role;
import com.swiftcare.backend.common.enums.Tier;
import com.swiftcare.backend.common.exception.EmailAlreadyExistsException;
import com.swiftcare.backend.common.exception.UnauthorizedException;
import com.swiftcare.backend.common.security.JwtUtil;
import com.swiftcare.backend.patient.Patient;
import com.swiftcare.backend.patient.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.swiftcare.backend.auth.dto.ForgotPasswordRequest;
import com.swiftcare.backend.auth.dto.ResetPasswordRequest;

import java.time.LocalDateTime;
import java.util.UUID;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final PatientRepository patientRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final com.swiftcare.backend.consultation.DoctorRepository doctorRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailService emailService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (patientRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyExistsException(
                    "A patient with this email already exists"
            );
        }

        Patient patient = Patient.builder()
                .name(request.getName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .dateOfBirth(request.getDateOfBirth())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .build();

        Patient saved = patientRepository.save(patient);

        String accessToken = jwtUtil.generateToken(
                saved.getEmail(),
                Role.PATIENT.name(),
                Tier.FREE.name()
        );

        String refreshToken = createRefreshToken(saved);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .patientId(saved.getId())
                .name(saved.getName())
                .email(saved.getEmail())
                .tier(Tier.FREE)
                .build();
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        Patient patient = patientRepository.findByEmail(request.getEmail())
                .orElseThrow(() ->
                        new UnauthorizedException("Invalid email or password")
                );

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

        String refreshToken = createRefreshToken(patient);

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

    @Transactional
    public AuthResponse refresh(String refreshToken) {
        RefreshToken stored = refreshTokenRepository.findByToken(refreshToken)
                .orElseThrow(() ->
                        new UnauthorizedException("Invalid refresh token")
                );

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

        Patient patient = stored.getPatient();

        stored.setRevoked(true);
        refreshTokenRepository.save(stored);

        String newAccessToken = jwtUtil.generateToken(
                patient.getEmail(),
                patient.getRole().name(),
                patient.getTier().name()
        );

        String newRefreshToken = createRefreshToken(patient);

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .tokenType("Bearer")
                .patientId(patient.getId())
                .name(patient.getName())
                .email(patient.getEmail())
                .tier(patient.getTier())
                .build();
    }

    @Transactional
    public void logout(String refreshToken) {
        RefreshToken stored = refreshTokenRepository.findByToken(refreshToken)
                .orElseThrow(() ->
                        new UnauthorizedException("Invalid refresh token")
                );

        stored.setRevoked(true);
        refreshTokenRepository.save(stored);
    }

    private String createRefreshToken(Patient patient) {
        RefreshToken refreshToken = RefreshToken.builder()
                .patient(patient)
                .token(UUID.randomUUID().toString())
                .build();

        refreshTokenRepository.save(refreshToken);

        return refreshToken.getToken();
    }

    @Transactional
    public StaffAuthResponse staffLogin(LoginRequest request) {
        com.swiftcare.backend.consultation.Doctor doctor =
                doctorRepository.findByEmail(request.getEmail())
                        .orElseThrow(() ->
                                new UnauthorizedException(
                                        "Invalid email or password"
                                )
                        );

        if (!passwordEncoder.matches(
                request.getPassword(),
                doctor.getPasswordHash()
        )) {
            throw new UnauthorizedException("Invalid email or password");
        }

        String accessToken = jwtUtil.generateToken(
                doctor.getEmail(),
                doctor.getRole().name()
        );

        String refreshToken = createStaffRefreshToken(doctor);

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

    private String createStaffRefreshToken(
            com.swiftcare.backend.consultation.Doctor doctor
    ) {
        Patient fakePatient = patientRepository
                .findByEmail(doctor.getEmail())
                .orElse(null);

        if (fakePatient != null) {
            RefreshToken refreshToken = RefreshToken.builder()
                    .patient(fakePatient)
                    .token(UUID.randomUUID().toString())
                    .build();

            refreshTokenRepository.save(refreshToken);

            return refreshToken.getToken();
        }

        return UUID.randomUUID().toString();
    }
    @Transactional
public void forgotPassword(ForgotPasswordRequest request) {
    String email = request.getEmail().trim().toLowerCase();

    Patient patient = patientRepository.findByEmail(email)
            .orElse(null);

    /*
     * Always return normally when the email does not exist.
     * This prevents attackers from discovering registered accounts.
     */
    if (patient == null) {
        return;
    }

    passwordResetTokenRepository.deleteByPatientId(patient.getId());

    String token = UUID.randomUUID().toString();

    PasswordResetToken resetToken = PasswordResetToken.builder()
            .id(UUID.randomUUID())
            .patient(patient)
            .token(token)
            .expiresAt(LocalDateTime.now().plusMinutes(15))
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
                    .orElseThrow(() ->
                            new UnauthorizedException(
                                    "Invalid or expired password reset token"
                            )
                    );

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

    patient.setPasswordHash(
            passwordEncoder.encode(request.getNewPassword())
    );

    patientRepository.save(patient);

    resetToken.setUsed(true);
    passwordResetTokenRepository.save(resetToken);

    /*
     * Revoke existing sessions after a password change.
     */
    refreshTokenRepository.deleteByPatientId(patient.getId());
}
}