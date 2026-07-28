package com.swiftcare.backend.consultation.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
public class CompleteConsultationRequest {

    private UUID queueEntryId;

    private UUID consultationId;

    @NotBlank(message = "Diagnosis is required")
    @Size(max = 500, message = "Diagnosis cannot exceed 500 characters")
    private String diagnosis;

    @Size(max = 10000, message = "Consultation notes are too long")
    private String consultationNotes;

    @DecimalMin(value = "30.0", message = "Temperature must be at least 30°C")
    @DecimalMax(value = "45.0", message = "Temperature cannot exceed 45°C")
    private BigDecimal temperatureCelsius;

    @Pattern(
            regexp = "^\\s*\\d{2,3}\\s*/\\s*\\d{2,3}\\s*$",
            message = "Blood pressure must use a format such as 120/80"
    )
    private String bloodPressure;

    @Min(value = 20, message = "Pulse rate is below the supported range")
    @Max(value = 250, message = "Pulse rate is above the supported range")
    private Integer pulseRate;

    @Min(value = 5, message = "Respiratory rate is below the supported range")
    @Max(value = 80, message = "Respiratory rate is above the supported range")
    private Integer respiratoryRate;

    @Min(value = 50, message = "Oxygen saturation is below the supported range")
    @Max(value = 100, message = "Oxygen saturation cannot exceed 100")
    private Integer oxygenSaturation;

    @DecimalMin(value = "0.5", message = "Weight must be positive")
    @DecimalMax(value = "500.0", message = "Weight exceeds the supported range")
    private BigDecimal weightKg;

    @Size(max = 5000, message = "Follow-up instructions are too long")
    private String followUpInstructions;

    @Size(max = 5000, message = "Referral notes are too long")
    private String referralNotes;

    @Size(max = 50, message = "A prescription cannot contain more than 50 drugs")
    private List<@NotBlank(message = "Drug name cannot be blank") String> drugs =
            new ArrayList<>();

    @Size(max = 20, message = "A consultation cannot contain more than 20 laboratory orders")
    private List<@NotNull(message = "Laboratory order cannot be null") @Valid LabOrderItemRequest> labOrders = new ArrayList<>();
}
