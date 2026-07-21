package com.swiftcare.backend.appointment.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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

    @Min(value = 1, message = "Severity score must be between 1 and 4")
    @Max(value = 4, message = "Severity score must be between 1 and 4")
    private int severityScore;
}