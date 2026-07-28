package com.swiftcare.backend.patient;

import com.swiftcare.backend.auth.RefreshTokenRepository;
import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientRepository patientRepository;
    private final PasswordEncoder passwordEncoder;
    private final RefreshTokenRepository refreshTokenRepository;

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMe(
            @AuthenticationPrincipal String email
    ) {
        return ResponseEntity.ok(
                toResponse(findPatientByEmail(email))
        );
    }

    @PutMapping("/me")
    public ResponseEntity<Map<String, Object>> updateMe(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody UpdatePatientRequest request
    ) {
        Patient patient = findPatientByEmail(email);
        patient.setName(request.getName().trim());
        patient.setPhone(request.getPhone().trim());

        return ResponseEntity.ok(
                toResponse(patientRepository.save(patient))
        );
    }

    @PutMapping("/me/password")
    public ResponseEntity<Map<String, String>> changePassword(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody ChangePasswordRequest request
    ) {
        Patient patient = findPatientByEmail(email);

        if (!passwordEncoder.matches(
                request.getCurrentPassword(),
                patient.getPasswordHash()
        )) {
            throw new IllegalArgumentException(
                    "Current password is incorrect"
            );
        }

        if (passwordEncoder.matches(
                request.getNewPassword(),
                patient.getPasswordHash()
        )) {
            throw new IllegalArgumentException(
                    "New password must be different from the current password"
            );
        }

        patient.setPasswordHash(
                passwordEncoder.encode(request.getNewPassword())
        );
        patientRepository.save(patient);

        // Force every existing session to authenticate again.
        refreshTokenRepository.deleteByPatientId(patient.getId());

        return ResponseEntity.ok(
                Map.of("message", "Password changed successfully")
        );
    }

    private Patient findPatientByEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalStateException(
                    "Authenticated patient email is unavailable"
            );
        }

        return patientRepository
                .findByEmailIgnoreCaseAndIsDeletedFalse(email.trim())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Authenticated patient account not found"
                ));
    }

    private Map<String, Object> toResponse(Patient patient) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", patient.getId());
        response.put("name", patient.getName());
        response.put("email", patient.getEmail());
        response.put("phone", patient.getPhone());
        response.put("tier", patient.getTier());
        response.put("role", patient.getRole());
        response.put("createdAt", patient.getCreatedAt());
        return response;
    }
}
