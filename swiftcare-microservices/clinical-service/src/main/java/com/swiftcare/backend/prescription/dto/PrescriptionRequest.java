package com.swiftcare.backend.prescription.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
public class PrescriptionRequest {

    @NotNull(message = "Consultation ID is required")
    private UUID consultationId;

    @NotEmpty(message = "At least one drug is required")
    @Size(
            max = 50,
            message = "A prescription cannot contain more than 50 drugs"
    )
    private List<
            @NotBlank(message = "Drug name cannot be blank")
            String
            > drugs;
}