package com.swiftcare.backend.healthprofile;

import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.healthprofile.dto.HealthProfileRequest;
import com.swiftcare.backend.healthprofile.dto.HealthProfileResponse;
import com.swiftcare.backend.patient.PatientRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/profile")
@RequiredArgsConstructor
public class HealthProfileController {

    private final HealthProfileService healthProfileService;
    private final PatientRepository patientRepository;

    @PostMapping("/health")
    public ResponseEntity<HealthProfileResponse> createProfile(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody HealthProfileRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(healthProfileService.createProfile(
                        getPatientId(email),
                        request
                ));
    }

    @GetMapping("/health")
    public ResponseEntity<HealthProfileResponse> getProfile(
            @AuthenticationPrincipal String email
    ) {
        return ResponseEntity.ok(
                healthProfileService.getProfile(getPatientId(email))
        );
    }

    @PutMapping("/health")
    public ResponseEntity<HealthProfileResponse> updateProfile(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody HealthProfileRequest request
    ) {
        return ResponseEntity.ok(
                healthProfileService.updateProfile(
                        getPatientId(email),
                        request
                )
        );
    }

    private UUID getPatientId(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalStateException(
                    "Authenticated patient email is unavailable"
            );
        }

        return patientRepository
                .findByEmailIgnoreCaseAndIsDeletedFalse(email.trim())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Authenticated patient account not found"
                ))
                .getId();
    }
}
