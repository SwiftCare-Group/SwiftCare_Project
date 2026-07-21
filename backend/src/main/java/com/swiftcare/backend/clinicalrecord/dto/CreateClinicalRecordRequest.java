package com.swiftcare.backend.clinicalrecord.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateClinicalRecordRequest {

    @NotNull(message = "Queue entry ID is required")
    private UUID queueEntryId;

    @NotBlank(message = "Diagnosis is required")
    @Size(
            max = 500,
            message = "Diagnosis cannot exceed 500 characters"
    )
    private String diagnosis;

    private String consultationNotes;

    private String prescription;

    private String labRequest;
}