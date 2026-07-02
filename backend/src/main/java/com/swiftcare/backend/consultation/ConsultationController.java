package com.swiftcare.backend.consultation;

import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.common.security.PremiumRequired;
import com.swiftcare.backend.consultation.dto.ConsultationRequest;
import com.swiftcare.backend.consultation.dto.ConsultationResponse;
import com.swiftcare.backend.patient.PatientRepository;
import com.swiftcare.backend.consultation.dto.DoctorResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/consultations")
@RequiredArgsConstructor
public class ConsultationController {

    private final ConsultationService consultationService;
    private final PatientRepository patientRepository;

    @GetMapping("/doctors")
    public ResponseEntity<List<DoctorResponse>> getAvailableDoctors() {
        return ResponseEntity.ok(consultationService.getAvailableDoctors());
    }

    @PostMapping
    @PremiumRequired
    public ResponseEntity<ConsultationResponse> book(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody ConsultationRequest request) {
        UUID patientId = getPatientId(email);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(consultationService.bookConsultation(patientId, request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ConsultationResponse> getOne(@PathVariable UUID id) {
        return ResponseEntity.ok(consultationService.getConsultation(id));
    }

    @PutMapping("/{id}/join")
    public ResponseEntity<ConsultationResponse> join(@PathVariable UUID id) {
        return ResponseEntity.ok(consultationService.joinSession(id));
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<ConsultationResponse> complete(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body) {
        String notes = body != null ? body.getOrDefault("notes", "") : "";
        return ResponseEntity.ok(consultationService.completeSession(id, notes));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<ConsultationResponse> cancel(@PathVariable UUID id) {
        return ResponseEntity.ok(consultationService.cancelConsultation(id));
    }

    @GetMapping
    public ResponseEntity<List<ConsultationResponse>> getAll(
            @AuthenticationPrincipal String email) {
        UUID patientId = getPatientId(email);
        return ResponseEntity.ok(consultationService.getPatientConsultations(patientId));
    }

    private UUID getPatientId(String email) {
        return patientRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"))
                .getId();
    }
}