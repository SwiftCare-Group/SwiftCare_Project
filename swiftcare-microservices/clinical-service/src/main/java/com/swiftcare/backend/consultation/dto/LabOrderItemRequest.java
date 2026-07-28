package com.swiftcare.backend.consultation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class LabOrderItemRequest {

    @NotBlank(message = "Laboratory test name is required")
    @Size(max = 150, message = "Laboratory test name cannot exceed 150 characters")
    private String testName;

    @Size(max = 2000, message = "Clinical reason is too long")
    private String clinicalReason;

    @Size(max = 2000, message = "Laboratory instructions are too long")
    private String instructions;
}
