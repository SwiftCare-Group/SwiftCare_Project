package com.swiftcare.backend.prescription.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PrescriptionResponse {
    private UUID id;
    private UUID consultationId;
    private UUID patientId;
    private UUID doctorId;
    private List<String> drugs;
    private String qrCodeData;
    private LocalDateTime issuedAt;
}