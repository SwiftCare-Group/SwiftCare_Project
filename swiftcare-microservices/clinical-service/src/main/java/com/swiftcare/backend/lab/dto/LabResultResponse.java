package com.swiftcare.backend.lab.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class LabResultResponse {

    private UUID id;

    private UUID labOrderId;

    private String result;

    private String interpretation;

    private String notes;

    private String performedBy;

    private LocalDateTime performedAt;
}