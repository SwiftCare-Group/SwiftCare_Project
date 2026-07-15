package com.swiftcare.backend.symptom.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FirstAidResponse {
    private String severityLabel;
    private Boolean isEmergency;
    private String firstAidContent;
}