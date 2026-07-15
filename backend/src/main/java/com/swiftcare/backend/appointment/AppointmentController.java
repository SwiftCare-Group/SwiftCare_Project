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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
    public ResponseEntity<AppointmentResponse> book(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody AppointmentRequest request) {
        UUID patientId = getPatientId(email);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(appointmentService.bookAppointment(patientId, request));
    }

    @GetMapping
    public ResponseEntity<List<AppointmentResponse>> getAll(
            @AuthenticationPrincipal String email) {
        UUID patientId = getPatientId(email);
        return ResponseEntity.ok(appointmentService.getPatientAppointments(patientId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppointmentResponse> getOne(@PathVariable UUID id) {
        return ResponseEntity.ok(appointmentService.getAppointment(id));
    }

    @GetMapping("/{id}/queue")
    public ResponseEntity<QueueStatusResponse> getQueueStatus(@PathVariable UUID id) {
        return ResponseEntity.ok(appointmentService.getQueueStatus(id));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<AppointmentResponse> cancel(@PathVariable UUID id) {
        return ResponseEntity.ok(appointmentService.cancelAppointment(id));
    }

    private UUID getPatientId(String email) {
        return patientRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"))
                .getId();
    }
}