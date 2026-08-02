package com.swiftcare.backend.appointment.dto;

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
public class QueueStatusResponse {
    private UUID appointmentId;
    private int currentPosition;
    private LocalDateTime estimatedCallTime;
    private boolean isEmergency;
    private String status;
}