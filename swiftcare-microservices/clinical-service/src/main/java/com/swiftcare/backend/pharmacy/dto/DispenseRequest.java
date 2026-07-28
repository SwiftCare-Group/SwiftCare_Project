package com.swiftcare.backend.pharmacy.dto;

import com.swiftcare.backend.common.enums.DispensationStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DispenseRequest {

    @NotBlank(message = "Drug name is required")
    private String drugName;

    @NotNull(message = "Dispensation status is required")
    private DispensationStatus status;

    @NotBlank(message = "Pharmacy name is required")
    @Size(max = 255, message = "Pharmacy name cannot exceed 255 characters")
    private String pharmacyName;

    @Size(max = 100, message = "Quantity cannot exceed 100 characters")
    private String quantityDispensed;

    @Size(max = 1000, message = "Dispensation notes cannot exceed 1000 characters")
    private String notes;
}
