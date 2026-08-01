package com.swiftcare.backend.symptom.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SymptomResponse {

    private UUID id;
    private UUID patientId;
    private String symptoms;

    /**
     * Patient-selected severity, from 1 to 4.
     */
    private Integer severityScore;
    private String severityLabel;

    /**
     * AI recommendation is returned separately for transparency.
     */
    private Integer aiRecommendedSeverityScore;
    private String aiStatus;

    private Boolean isEmergency;
    private String firstAidContent;
    private LocalDateTime createdAt;
}