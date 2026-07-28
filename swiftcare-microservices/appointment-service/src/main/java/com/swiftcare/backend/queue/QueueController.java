package com.swiftcare.backend.queue;

import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.patient.PatientRepository;
import com.swiftcare.backend.queue.dto.QueueEntryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class QueueController {

    private final QueueService queueService;
    private final PatientRepository patientRepository;

    @GetMapping("/departments/{departmentId}/queue")
    public ResponseEntity<List<DoctorQueueResponse>> getDepartmentQueue(
            @PathVariable UUID departmentId
    ) {
        return ResponseEntity.ok(
                queueService.getDepartmentQueue(departmentId)
        );
    }

    @GetMapping("/queue/{queueEntryId}")
    public ResponseEntity<QueueEntryResponse> getQueueEntry(
            @PathVariable UUID queueEntryId,
            Authentication authentication
    ) {
        QueueEntryResponse response = queueService.getQueueEntry(queueEntryId);

        if (!hasRole(authentication, "DOCTOR") && !hasRole(authentication, "ADMIN")) {
            UUID patientId = resolvePatientId(authentication);
            if (!patientId.equals(response.getPatientId())) {
                throw new SecurityException(
                        "You cannot access another patient's queue entry"
                );
            }
        }

        return ResponseEntity.ok(response);
    }

    @PatchMapping("/queue/{queueEntryId}/call")
    public ResponseEntity<Void> callPatient(@PathVariable UUID queueEntryId) {
        queueService.callPatient(queueEntryId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/queue/{queueEntryId}/skip")
    public ResponseEntity<Void> skipPatient(@PathVariable UUID queueEntryId) {
        queueService.skipPatient(queueEntryId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/queue/{queueEntryId}/start")
    public ResponseEntity<Void> startConsultation(@PathVariable UUID queueEntryId) {
        queueService.startConsultation(queueEntryId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/queue/{queueEntryId}/complete")
    public ResponseEntity<Void> completeConsultation(@PathVariable UUID queueEntryId) {
        queueService.completeConsultation(queueEntryId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/queue/{queueEntryId}/cancel")
    public ResponseEntity<Void> cancelQueueEntry(@PathVariable UUID queueEntryId) {
        queueService.cancelQueueEntry(queueEntryId);
        return ResponseEntity.noContent().build();
    }

    private UUID resolvePatientId(Authentication authentication) {
        if (authentication == null
                || authentication.getName() == null
                || authentication.getName().isBlank()) {
            throw new IllegalStateException(
                    "Authenticated patient email is unavailable"
            );
        }

        return patientRepository
                .findByEmailIgnoreCaseAndIsDeletedFalse(authentication.getName().trim())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Authenticated patient account was not found"
                ))
                .getId();
    }

    private boolean hasRole(Authentication authentication, String role) {
        return authentication != null
                && authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_" + role));
    }
}
