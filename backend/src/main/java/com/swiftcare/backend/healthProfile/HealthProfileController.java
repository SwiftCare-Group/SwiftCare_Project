package com.swiftcare.backend.healthprofile;

import com.swiftcare.backend.healthprofile.dto.HealthProfileRequest;
import com.swiftcare.backend.healthprofile.dto.HealthProfileResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/profile")
@RequiredArgsConstructor
public class HealthProfileController {

    private final HealthProfileService healthProfileService;
    private final com.swiftcare.backend.patient.PatientRepository patientRepository;

    @PostMapping("/health")
    public ResponseEntity<HealthProfileResponse> createProfile(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody HealthProfileRequest request) {

        UUID patientId = getPatientId(email);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(healthProfileService.createProfile(patientId, request));
    }

    @GetMapping("/health")
    public ResponseEntity<HealthProfileResponse> getProfile(
            @AuthenticationPrincipal String email) {

        UUID patientId = getPatientId(email);
        return ResponseEntity.ok(healthProfileService.getProfile(patientId));
    }

    @PutMapping("/health")
    public ResponseEntity<HealthProfileResponse> updateProfile(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody HealthProfileRequest request) {

        UUID patientId = getPatientId(email);
        return ResponseEntity.ok(healthProfileService.updateProfile(patientId, request));
    }

    private UUID getPatientId(String email) {
        return patientRepository.findByEmail(email)
                .orElseThrow(() -> new com.swiftcare.backend.common.exception.ResourceNotFoundException("Patient not found"))
                .getId();
    }
}