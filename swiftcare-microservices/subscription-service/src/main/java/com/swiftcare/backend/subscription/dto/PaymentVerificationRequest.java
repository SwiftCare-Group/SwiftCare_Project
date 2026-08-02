package com.swiftcare.backend.subscription.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PaymentVerificationRequest {
    @NotBlank(message = "Payment reference is required")
    @Size(max = 100, message = "Payment reference is invalid")
    private String reference;
}
