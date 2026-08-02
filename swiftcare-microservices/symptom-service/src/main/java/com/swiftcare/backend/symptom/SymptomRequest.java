package com.swiftcare.backend.symptom;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class SymptomRequest {

    @NotBlank(message = "Symptoms are required")
    @Size(
            max = 1000,
            message = "Symptoms must not exceed 1000 characters"
    )
    private String symptoms;

    @NotNull(message = "Severity score is required")
    @Min(value = 1, message = "Severity score must be between 1 and 4")
    @Max(value = 4, message = "Severity score must be between 1 and 4")
    private Integer severityScore;
}