package com.swiftcare.backend.appointment.dto;

import com.swiftcare.backend.common.enums.AppointmentStatus;
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
public class AppointmentResponse {
    private UUID id;
    private UUID patientId;
    private UUID departmentId;
    private String departmentName;
    private LocalDateTime scheduledTime;
    private int queuePosition;
    private int severityScore;
    private boolean isEmergency;
    private AppointmentStatus status;
    private LocalDateTime createdAt;
}