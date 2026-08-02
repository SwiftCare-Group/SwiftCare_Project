package com.swiftcare.backend.appointment.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppointmentRequest {

    @NotNull(message = "Department ID is required")
    private UUID departmentId;

    @NotNull(message = "Scheduled time is required")
    @Future(message = "Scheduled time must be in the future")
    private LocalDateTime scheduledTime;

    /**
     * Retained for compatibility with the mobile payload.
     * AppointmentService verifies it against the saved symptom submission.
     */
    @Min(value = 1, message = "Severity score must be between 1 and 4")
    @Max(value = 4, message = "Severity score must be between 1 and 4")
    private Integer severityScore;

    @NotNull(message = "A submitted symptom assessment is required")
    private UUID symptomAssessmentId;
}