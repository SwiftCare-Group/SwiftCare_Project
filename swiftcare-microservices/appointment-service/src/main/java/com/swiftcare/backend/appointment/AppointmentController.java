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

        AppointmentResponse response =
                appointmentService.bookAppointment(patientId, request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
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
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(
                appointmentService.getAppointment(id)
        );
    }

    @GetMapping("/{id}/queue")
    public ResponseEntity<QueueStatusResponse> getQueueStatus(
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(
                appointmentService.getQueueStatus(id)
        );
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<AppointmentResponse> cancelAppointment(
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(
                appointmentService.cancelAppointment(id)
        );
    }

    private UUID getAuthenticatedPatientId(
            Authentication authentication
    ) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null
                || authentication.getName().isBlank()) {

            throw new IllegalStateException(
                    "Authenticated patient email is unavailable"
            );
        }

        String email = authentication.getName();

        return patientRepository.findByEmail(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Patient not found for email: " + email
                        )
                )
                .getId();
    }
}