package com.swiftcare.backend.appointment.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
public class AppointmentRequest {

    @NotNull(message = "Department is required")
    private UUID departmentId;

    @NotNull(message = "Scheduled time is required")
    private LocalDateTime scheduledTime;

    private int severityScore;
}