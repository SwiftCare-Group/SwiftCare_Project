package com.swiftcare.backend.clinicalrecord;

import com.swiftcare.backend.clinicalrecord.dto.ClinicalRecordResponse;
import com.swiftcare.backend.clinicalrecord.dto.CreateClinicalRecordRequest;
import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.consultation.DoctorRepository;
import com.swiftcare.backend.patient.PatientRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/clinical-records")
@RequiredArgsConstructor
public class ClinicalRecordController {

    private final ClinicalRecordService clinicalRecordService;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;

    @PostMapping("/complete")
    public ResponseEntity<ClinicalRecordResponse> createAndCompleteClinicalRecord(
            Authentication authentication,
            @Valid @RequestBody CreateClinicalRecordRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(clinicalRecordService.createAndCompleteClinicalRecord(
                        authenticatedEmail(authentication),
                        request
                ));
    }

    @PostMapping
    public ResponseEntity<ClinicalRecordResponse> createClinicalRecord(
            Authentication authentication,
            @Valid @RequestBody CreateClinicalRecordRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(clinicalRecordService.createClinicalRecord(
                        authenticatedEmail(authentication),
                        request
                ));
    }

    @GetMapping("/queue/{queueEntryId}")
    public ResponseEntity<ClinicalRecordResponse> getByQueueEntry(
            @PathVariable UUID queueEntryId,
            Authentication authentication
    ) {
        ClinicalRecordResponse response =
                clinicalRecordService.getByQueueEntry(queueEntryId);
        ensureAssignedDoctorOrAdmin(response, authentication);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/patient/me")
    public ResponseEntity<List<ClinicalRecordResponse>> getAuthenticatedPatientRecords(
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                clinicalRecordService.getPatientRecordsByEmail(
                        authenticatedEmail(authentication)
                )
        );
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<ClinicalRecordResponse>> getPatientRecords(
            @PathVariable UUID patientId
    ) {
        return ResponseEntity.ok(
                clinicalRecordService.getPatientRecords(patientId)
        );
    }

    @GetMapping("/doctor/me")
    public ResponseEntity<List<ClinicalRecordResponse>> getAuthenticatedDoctorRecords(
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                clinicalRecordService.getDoctorRecords(
                        authenticatedEmail(authentication)
                )
        );
    }

    @GetMapping("/{clinicalRecordId}")
    public ResponseEntity<ClinicalRecordResponse> getClinicalRecord(
            @PathVariable UUID clinicalRecordId,
            Authentication authentication
    ) {
        ClinicalRecordResponse response =
                clinicalRecordService.getClinicalRecord(clinicalRecordId);

        if (hasRole(authentication, "ADMIN")) {
            return ResponseEntity.ok(response);
        }

        if (hasRole(authentication, "PATIENT")) {
            if (!authenticatedPatientId(authentication).equals(response.getPatientId())) {
                throw new SecurityException(
                        "You cannot access another patient's clinical record"
                );
            }
            return ResponseEntity.ok(response);
        }

        ensureAssignedDoctorOrAdmin(response, authentication);
        return ResponseEntity.ok(response);
    }

    private void ensureAssignedDoctorOrAdmin(
            ClinicalRecordResponse record,
            Authentication authentication
    ) {
        if (hasRole(authentication, "ADMIN")) {
            return;
        }

        if (!hasRole(authentication, "DOCTOR")
                || !authenticatedDoctorId(authentication).equals(record.getDoctorId())) {
            throw new SecurityException(
                    "Only the assigned doctor can access this clinical record"
            );
        }
    }

    private UUID authenticatedPatientId(Authentication authentication) {
        return patientRepository
                .findByEmailIgnoreCaseAndIsDeletedFalse(
                        authenticatedEmail(authentication)
                )
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Authenticated patient account not found"
                ))
                .getId();
    }

    private UUID authenticatedDoctorId(Authentication authentication) {
        return doctorRepository
                .findByEmailIgnoreCaseAndIsDeletedFalse(
                        authenticatedEmail(authentication)
                )
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Authenticated doctor account not found"
                ))
                .getId();
    }

    private String authenticatedEmail(Authentication authentication) {
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
