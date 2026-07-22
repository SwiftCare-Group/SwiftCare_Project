package com.swiftcare.backend.admin;

import lombok.Data;
import java.util.UUID;

@Data
public class CreateDoctorRequest {
    private String name;
    private String email;
    private String password;
    private String licenseNo;
    private UUID departmentId;
}