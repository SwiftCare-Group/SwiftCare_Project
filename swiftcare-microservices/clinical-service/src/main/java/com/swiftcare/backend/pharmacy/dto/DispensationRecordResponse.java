package com.swiftcare.backend.pharmacy.dto;

import com.swiftcare.backend.common.enums.DispensationStatus;
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
public class DispensationRecordResponse {
    private UUID id;
    private UUID prescriptionId;
    private String drugName;
    private DispensationStatus status;
    private String pharmacyName;
    private LocalDateTime dispensedAt;
}