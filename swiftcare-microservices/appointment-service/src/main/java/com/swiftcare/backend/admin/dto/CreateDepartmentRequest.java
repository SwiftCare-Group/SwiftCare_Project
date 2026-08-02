package com.swiftcare.backend.admin;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateDepartmentRequest {

    @NotBlank(message = "Department name is required")
    @Size(max = 120, message = "Department name must not exceed 120 characters")
    private String name;

    @NotBlank(message = "Operating hours are required")
    @Pattern(
            regexp = "^(?:[01]\\d|2[0-3]):[0-5]\\d\\s*-\\s*(?:[01]\\d|2[0-3]):[0-5]\\d$",
            message = "Operating hours must use HH:mm - HH:mm"
    )
    private String operatingHours;

    @Min(value = 1, message = "Queue capacity must be at least 1")
    @Max(value = 10000, message = "Queue capacity is too large")
    private int queueCapacity;
}
