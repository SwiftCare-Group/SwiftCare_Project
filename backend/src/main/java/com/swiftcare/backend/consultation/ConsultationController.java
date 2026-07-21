package com.swiftcare.backend.consultation;

import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.common.security.PremiumRequired;
import com.swiftcare.backend.consultation.dto.ConsultationRequest;
import com.swiftcare.backend.consultation.dto.ConsultationResponse;
import com.swiftcare.backend.consultation.dto.DoctorResponse;
import com.swiftcare.backend.patient.PatientRepository;
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
    private final DoctorRepository doctorRepository;

    @GetMapping("/doctors")
    public ResponseEntity<List<DoctorResponse>> getAvailableDoctors() {
        return ResponseEntity.ok(
                consultationService.getAvailableDoctors()
        );
    }

    @PostMapping
    @PremiumRequired
    public ResponseEntity<ConsultationResponse> bookConsultation(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody ConsultationRequest request
    ) {
        UUID patientId = getPatientId(email);

        ConsultationResponse response =
                consultationService.bookConsultation(
                        patientId,
                        request
                );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping
    public ResponseEntity<List<ConsultationResponse>>
    getPatientConsultations(
            @AuthenticationPrincipal String email
    ) {
        UUID patientId = getPatientId(email);

        return ResponseEntity.ok(
                consultationService
                        .getPatientConsultations(patientId)
        );
    }

    @GetMapping("/doctor/me")
    public ResponseEntity<List<ConsultationResponse>>
    getDoctorConsultations(
            @AuthenticationPrincipal String email
    ) {
        UUID doctorId = getDoctorId(email);

        return ResponseEntity.ok(
                consultationService
                        .getDoctorConsultations(doctorId)
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<ConsultationResponse> getConsultation(
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(
                consultationService.getConsultation(id)
        );
    }

    @PutMapping("/{id}/join")
    public ResponseEntity<ConsultationResponse> joinConsultation(
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(
                consultationService.joinSession(id)
        );
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<ConsultationResponse> completeConsultation(
            @PathVariable UUID id,
            @RequestBody(required = false)
            Map<String, String> body
    ) {
        String notes = body == null
                ? ""
                : body.getOrDefault("notes", "");

        return ResponseEntity.ok(
                consultationService.completeSession(
                        id,
                        notes
                )
        );
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<ConsultationResponse> cancelConsultation(
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(
                consultationService.cancelConsultation(id)
        );
    }

    private UUID getPatientId(String email) {
        validateAuthenticatedEmail(email);

        return patientRepository.findByEmail(email)
                .orElseThrow(
                        () -> new ResourceNotFoundException(
                                "Patient account not found"
                        )
                )
                .getId();
    }

    private UUID getDoctorId(String email) {
        validateAuthenticatedEmail(email);

        return doctorRepository.findByEmail(email)
                .orElseThrow(
                        () -> new ResourceNotFoundException(
                                "Doctor account not found"
                        )
                )
                .getId();
    }

    private void validateAuthenticatedEmail(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalStateException(
                    "Authenticated user email is unavailable"
            );
        }
    }
}