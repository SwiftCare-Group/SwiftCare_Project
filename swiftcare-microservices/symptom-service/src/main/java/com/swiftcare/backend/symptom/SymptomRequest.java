package com.swiftcare.backend.symptom;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SymptomRequest {

    @NotBlank(message = "Symptoms description is required")
    private String symptoms;
}