package com.swiftcare.backend.pharmacy.dto;

import com.swiftcare.backend.common.enums.DispensationStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DispenseRequest {

    @NotBlank(message = "Drug name is required")
    private String drugName;

    @NotNull(message = "Dispensation status is required")
    private DispensationStatus status;

    private String pharmacyName;
}