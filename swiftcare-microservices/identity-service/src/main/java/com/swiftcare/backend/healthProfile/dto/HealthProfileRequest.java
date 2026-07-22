package com.swiftcare.backend.healthprofile.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class HealthProfileRequest {

    @NotNull(message = "Conditions list is required")
    private List<String> conditions;

    @NotNull(message = "Chronic illnesses list is required")
    private List<String> chronicIllnesses;

    @NotNull(message = "Known diagnoses list is required")
    private List<String> knownDiagnoses;
}