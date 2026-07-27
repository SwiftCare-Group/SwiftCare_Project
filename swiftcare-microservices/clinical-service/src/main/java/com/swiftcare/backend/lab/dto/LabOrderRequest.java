package com.swiftcare.backend.lab.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class LabOrderRequest {

    @NotNull(message = "Consultation ID is required")
    private UUID consultationId;

    @NotBlank(message = "Test name is required")
    private String testName;

    private String clinicalReason;

    private String instructions;
}