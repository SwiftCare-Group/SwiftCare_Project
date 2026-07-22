package com.swiftcare.backend.symptom;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiClassificationResult {
    private int severityScore;
    private String severityLabel;
    private boolean isEmergency;
    private String firstAidContent;
}