package com.swiftcare.backend.auth;

import com.swiftcare.backend.auth.dto.AuthResponse;
import com.swiftcare.backend.auth.dto.LoginRequest;
import com.swiftcare.backend.auth.dto.RegisterRequest;
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

@Service
@RequiredArgsConstructor
public class AuthService {

    private final PatientRepository patientRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthResponse register(RegisterRequest request) {
        if (patientRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyExistsException("A patient with this email already exists");
        }

        Patient patient = Patient.builder()
                .name(request.getName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .dateOfBirth(request.getDateOfBirth())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .build();

        Patient saved = patientRepository.save(patient);

        String token = jwtUtil.generateToken(saved.getEmail(), Role.PATIENT.name());

        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .patientId(saved.getId())
                .name(saved.getName())
                .email(saved.getEmail())
                .tier(Tier.FREE)
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        Patient patient = patientRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), patient.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password");
        }

        String token = jwtUtil.generateToken(patient.getEmail(), patient.getRole().name());

        return AuthResponse.builder()
                .accessToken(token)
                .tokenType("Bearer")
                .patientId(patient.getId())
                .name(patient.getName())
                .email(patient.getEmail())
                .tier(patient.getTier())
                .build();
    }
}