package com.swiftcare.backend.patient;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdatePatientRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Phone number is required")
    private String phone;
}