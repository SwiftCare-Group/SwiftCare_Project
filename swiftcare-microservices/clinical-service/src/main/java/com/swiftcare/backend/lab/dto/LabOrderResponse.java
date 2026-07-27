package com.swiftcare.backend.lab.dto;

import com.swiftcare.backend.lab.LabStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class LabOrderResponse {

    private UUID id;

    private UUID consultationId;

    private UUID patientId;

    private String patientName;

    private UUID doctorId;

    private String doctorName;

    private String testName;

    private String clinicalReason;

    private String instructions;

    private LabStatus status;

    private LocalDateTime orderedAt;

    private LocalDateTime updatedAt;

    private LabResultResponse result;
}