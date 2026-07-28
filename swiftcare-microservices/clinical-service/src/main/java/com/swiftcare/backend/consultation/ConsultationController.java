package com.swiftcare.backend.consultation;

import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.common.security.PremiumRequired;
import com.swiftcare.backend.consultation.dto.CompleteConsultationRequest;
import com.swiftcare.backend.consultation.dto.ConsultationCompletionResponse;
import com.swiftcare.backend.consultation.dto.ConsultationRequest;
import com.swiftcare.backend.consultation.dto.ConsultationResponse;
import com.swiftcare.backend.consultation.dto.DoctorResponse;
import com.swiftcare.backend.patient.PatientRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/consultations")
@RequiredArgsConstructor
public class ConsultationController {

    private final ConsultationService consultationService;
    private final ConsultationWorkflowService consultationWorkflowService;
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
            Authentication authentication,
            @Valid @RequestBody ConsultationRequest request
    ) {
        UUID patientId = getPatientId(authentication);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(consultationService.bookConsultation(patientId, request));
    }

    @GetMapping
    public ResponseEntity<List<ConsultationResponse>> getPatientConsultations(
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                consultationService.getPatientConsultations(
                        getPatientId(authentication)
                )
        );
    }

    @GetMapping("/doctor/me")
    public ResponseEntity<List<ConsultationResponse>> getDoctorConsultations(
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                consultationService.getDoctorConsultations(
                        getDoctorId(authentication)
                )
        );
    }


    @PostMapping("/complete-workflow")
    public ResponseEntity<ConsultationCompletionResponse> completeWorkflow(
            Authentication authentication,
            @Valid @RequestBody CompleteConsultationRequest request
    ) {
        return ResponseEntity.ok(
                consultationWorkflowService.completeConsultation(
                        getAuthenticatedEmail(authentication),
                        request
                )
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<ConsultationResponse> getConsultation(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        ConsultationResponse response = consultationService.getConsultation(id);
        ensureCanAccess(response, authentication);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/join")
    public ResponseEntity<ConsultationResponse> joinConsultation(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        ConsultationResponse current = consultationService.getConsultation(id);
        ensureCanAccess(current, authentication);

        return ResponseEntity.ok(
                consultationService.joinSession(id)
        );
    }

    @PutMapping("/{id}/complete")
    public ResponseEntity<ConsultationResponse> completeConsultation(
            @PathVariable UUID id,
            @RequestBody(required = false) Map<String, String> body,
            Authentication authentication
    ) {
        ConsultationResponse current = consultationService.getConsultation(id);
        ensureAssignedDoctorOrAdmin(current, authentication);

        String notes = body == null
                ? ""
                : body.getOrDefault("notes", "");

        return ResponseEntity.ok(
                consultationService.completeSession(id, notes)
        );
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<ConsultationResponse> cancelConsultation(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        ConsultationResponse current = consultationService.getConsultation(id);

        if (hasRole(authentication, "PATIENT")) {
            if (!getPatientId(authentication).equals(current.getPatientId())) {
                throw new SecurityException(
                        "You cannot cancel another patient's consultation"
                );
            }
            if (current.getStatus()
                    != com.swiftcare.backend.common.enums.ConsultationStatus.SCHEDULED) {
                throw new IllegalStateException(
                        "Only a scheduled consultation can be cancelled by the patient"
                );
            }
        } else {
            ensureAssignedDoctorOrAdmin(current, authentication);
        }

        return ResponseEntity.ok(
                consultationService.cancelConsultation(id)
        );
    }

    private void ensureCanAccess(
            ConsultationResponse consultation,
            Authentication authentication
    ) {
        if (hasRole(authentication, "ADMIN")) {
            return;
        }

        if (hasRole(authentication, "PATIENT")) {
            if (!getPatientId(authentication).equals(consultation.getPatientId())) {
                throw new SecurityException(
                        "You cannot access another patient's consultation"
                );
            }
            return;
        }

        ensureAssignedDoctorOrAdmin(consultation, authentication);
    }

    private void ensureAssignedDoctorOrAdmin(
            ConsultationResponse consultation,
            Authentication authentication
    ) {
        if (hasRole(authentication, "ADMIN")) {
            return;
        }

        if (!hasRole(authentication, "DOCTOR")
                || !getDoctorId(authentication).equals(consultation.getDoctorId())) {
            throw new SecurityException(
                    "Only the assigned doctor can update this consultation"
            );
        }
    }

    private UUID getPatientId(Authentication authentication) {
        String email = getAuthenticatedEmail(authentication);

        return patientRepository
                .findByEmailIgnoreCaseAndIsDeletedFalse(email)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Patient account not found"
                ))
                .getId();
    }

    private UUID getDoctorId(Authentication authentication) {
        String email = getAuthenticatedEmail(authentication);

        return doctorRepository
                .findByEmailIgnoreCaseAndIsDeletedFalse(email)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Doctor account not found"
                ))
                .getId();
    }

    private String getAuthenticatedEmail(Authentication authentication) {
        if (authentication == null
                || authentication.getName() == null
                || authentication.getName().isBlank()) {
            throw new IllegalStateException(
                    "Authenticated user email is unavailable"
            );
        }

        return authentication.getName().trim();
    }

    private boolean hasRole(Authentication authentication, String role) {
        return authentication != null
                && authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_" + role));
    }
}
