package com.swiftcare.backend.prescription.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class QrLookupRequest {
    @NotBlank(message = "Scanned QR data is required")
    @Size(max = 4096, message = "Scanned QR data is too long")
    private String code;
}
