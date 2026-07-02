package com.swiftcare.backend.consultation.dto;

import com.swiftcare.backend.common.enums.ConsultationStatus;
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
public class ConsultationResponse {
    private UUID id;
    private UUID patientId;
    private UUID doctorId;
    private String doctorName;
    private LocalDateTime scheduledAt;
    private LocalDateTime startedAt;
    private LocalDateTime endedAt;
    private String sessionUrl;
    private ConsultationStatus status;
    private String notes;
    private LocalDateTime createdAt;
}