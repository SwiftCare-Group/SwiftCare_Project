package com.swiftcare.backend.prescription.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class PrescriptionRequest {

    @NotNull(message = "Consultation ID is required")
    private UUID consultationId;

    @NotEmpty(message = "At least one drug is required")
    private List<String> drugs;
}