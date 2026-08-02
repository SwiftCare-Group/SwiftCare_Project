package com.swiftcare.backend.lab.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LabResultRequest {

    @NotBlank(message = "Result is required")
    private String result;

    private String interpretation;

    private String notes;
}
