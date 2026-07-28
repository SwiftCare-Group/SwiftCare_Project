package com.swiftcare.backend.symptom;

import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.patient.PatientRepository;
import com.swiftcare.backend.symptom.dto.FirstAidResponse;
import com.swiftcare.backend.symptom.dto.SymptomResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/symptoms")
@RequiredArgsConstructor
public class SymptomController {

    private final SymptomService symptomService;
    private final PatientRepository patientRepository;

    @PostMapping("/submit")
    public ResponseEntity<SymptomResponse> submit(
            Authentication authentication,
            @Valid @RequestBody SymptomRequest request
    ) {
        UUID patientId = getPatientId(authentication);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(symptomService.submitSymptoms(patientId, request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SymptomResponse> getSubmission(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        SymptomResponse response = symptomService.getSubmission(id);
        ensureOwnerOrClinicalStaff(response.getPatientId(), authentication);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/firstaid")
    public ResponseEntity<FirstAidResponse> getFirstAid(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        SymptomResponse submission = symptomService.getSubmission(id);
        ensureOwnerOrClinicalStaff(submission.getPatientId(), authentication);
        return ResponseEntity.ok(symptomService.getFirstAid(id));
    }

    private void ensureOwnerOrClinicalStaff(
            UUID ownerPatientId,
            Authentication authentication
    ) {
        if (hasRole(authentication, "DOCTOR") || hasRole(authentication, "ADMIN")) {
            return;
        }

        if (!getPatientId(authentication).equals(ownerPatientId)) {
            throw new SecurityException(
                    "You cannot access another patient's symptom assessment"
            );
        }
    }

    private UUID getPatientId(Authentication authentication) {
        if (authentication == null
                || authentication.getName() == null
                || authentication.getName().isBlank()) {
            throw new IllegalStateException(
                    "Authenticated patient email is unavailable"
            );
        }

        return patientRepository
                .findByEmailIgnoreCaseAndIsDeletedFalse(
                        authentication.getName().trim()
                )
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Authenticated patient account not found"
                ))
                .getId();
    }

    private boolean hasRole(Authentication authentication, String role) {
        return authentication != null
                && authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_" + role));
    }
}
