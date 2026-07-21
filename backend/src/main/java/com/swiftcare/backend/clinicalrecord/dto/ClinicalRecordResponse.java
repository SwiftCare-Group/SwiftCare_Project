package com.swiftcare.backend.clinicalrecord.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ClinicalRecordResponse {

    private UUID id;

    private UUID queueEntryId;

    private UUID appointmentId;

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

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
}