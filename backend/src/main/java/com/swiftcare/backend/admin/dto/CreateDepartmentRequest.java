package com.swiftcare.backend.admin;

import lombok.Data;

@Data
public class CreateDepartmentRequest {
    private String name;
    private String operatingHours;
    private int queueCapacity;
}