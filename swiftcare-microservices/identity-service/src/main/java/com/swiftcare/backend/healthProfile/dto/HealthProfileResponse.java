package com.swiftcare.backend.healthprofile.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HealthProfileResponse {

    private UUID id;
    private UUID patientId;
    private List<String> conditions;
    private List<String> chronicIllnesses;
    private List<String> knownDiagnoses;
    private LocalDateTime updatedAt;
}