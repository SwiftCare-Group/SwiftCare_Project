package com.swiftcare.backend.clinicalrecord.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ClinicalRecordResponse {
    private UUID id;
    private UUID queueEntryId;
    private UUID appointmentId;
    private UUID consultationId;
    private UUID patientId;
    private String patientName;
    private UUID doctorId;
    private String doctorName;
    private UUID departmentId;
    private String departmentName;
    private String diagnosis;
    private String consultationNotes;
    private String prescription;
    private String labRequest;
    private BigDecimal temperatureCelsius;
    private String bloodPressure;
    private Integer pulseRate;
    private Integer respiratoryRate;
    private Integer oxygenSaturation;
    private BigDecimal weightKg;
    private String followUpInstructions;
    private String referralNotes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
