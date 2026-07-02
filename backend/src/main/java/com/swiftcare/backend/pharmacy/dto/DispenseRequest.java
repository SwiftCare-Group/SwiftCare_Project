package com.swiftcare.backend.pharmacy.dto;

import com.swiftcare.backend.common.enums.DispensationStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class DispenseRequest {

    @NotBlank(message = "Drug name is required")
    private String drugName;

    @NotNull(message = "Status is required")
    private DispensationStatus status;

    private String pharmacyName;
}