package com.swiftcare.backend.admin.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentResponse {
    private UUID id;
    private UUID hospitalId;
    private String hospitalName;
    private String name;
    private String operatingHours;
    private int queueCapacity;
    private boolean isActive;
}