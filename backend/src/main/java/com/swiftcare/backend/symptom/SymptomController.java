package com.swiftcare.backend.symptom;

import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.patient.PatientRepository;
import com.swiftcare.backend.symptom.dto.FirstAidResponse;
import com.swiftcare.backend.symptom.dto.SymptomResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
            @AuthenticationPrincipal String email,
            @Valid @RequestBody SymptomRequest request) {
        UUID patientId = getPatientId(email);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(symptomService.submitSymptoms(patientId, request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SymptomResponse> getSubmission(@PathVariable UUID id) {
        return ResponseEntity.ok(symptomService.getSubmission(id));
    }

    @GetMapping("/{id}/firstaid")
    public ResponseEntity<FirstAidResponse> getFirstAid(@PathVariable UUID id) {
        return ResponseEntity.ok(symptomService.getFirstAid(id));
    }

    private UUID getPatientId(String email) {
        return patientRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"))
                .getId();
    }
}