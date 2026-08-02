package com.swiftcare.backend.appointment;

import com.swiftcare.backend.appointment.dto.AppointmentRequest;
import com.swiftcare.backend.appointment.dto.AppointmentResponse;
import com.swiftcare.backend.appointment.dto.QueueStatusResponse;
import com.swiftcare.backend.common.exception.ResourceNotFoundException;
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
@RequestMapping("/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;
    private final PatientRepository patientRepository;

    @PostMapping
    public ResponseEntity<AppointmentResponse> bookAppointment(
            Authentication authentication,
            @Valid @RequestBody AppointmentRequest request
    ) {
        UUID patientId = getAuthenticatedPatientId(authentication);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(appointmentService.bookAppointment(patientId, request));
    }

    @GetMapping
    public ResponseEntity<List<AppointmentResponse>> getMyAppointments(
            Authentication authentication
    ) {
        UUID patientId = getAuthenticatedPatientId(authentication);

        return ResponseEntity.ok(
                appointmentService.getPatientAppointments(patientId)
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppointmentResponse> getAppointment(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        AppointmentResponse response = appointmentService.getAppointment(id);
        ensureCanReadAppointment(response.getPatientId(), authentication);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/queue")
    public ResponseEntity<QueueStatusResponse> getQueueStatus(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        AppointmentResponse appointment = appointmentService.getAppointment(id);
        ensureCanReadAppointment(appointment.getPatientId(), authentication);

        return ResponseEntity.ok(
                appointmentService.getQueueStatus(id)
        );
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<AppointmentResponse> cancelAppointment(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        AppointmentResponse appointment = appointmentService.getAppointment(id);
        ensureCanCancelAppointment(appointment.getPatientId(), authentication);

        return ResponseEntity.ok(
                appointmentService.cancelAppointment(id)
        );
    }

    private void ensureCanReadAppointment(
            UUID ownerPatientId,
            Authentication authentication
    ) {
        if (hasRole(authentication, "DOCTOR") || hasRole(authentication, "ADMIN")) {
            return;
        }

        ensurePatientOwnsResource(ownerPatientId, authentication);
    }

    private void ensureCanCancelAppointment(
            UUID ownerPatientId,
            Authentication authentication
    ) {
        if (hasRole(authentication, "ADMIN")) {
            return;
        }

        ensurePatientOwnsResource(ownerPatientId, authentication);
    }

    private void ensurePatientOwnsResource(
            UUID ownerPatientId,
            Authentication authentication
    ) {
        UUID authenticatedPatientId = getAuthenticatedPatientId(authentication);

        if (!authenticatedPatientId.equals(ownerPatientId)) {
            throw new SecurityException(
                    "You cannot access another patient's appointment"
            );
        }
    }

    private UUID getAuthenticatedPatientId(Authentication authentication) {
        if (authentication == null
                || !authentication.isAuthenticated()
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
