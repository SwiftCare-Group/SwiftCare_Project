package com.swiftcare.backend.admin;

import com.swiftcare.backend.common.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateDoctorRequest {

    @NotBlank(message = "Staff name is required")
    @Size(max = 150, message = "Staff name cannot exceed 150 characters")
    private String name;

    @NotBlank(message = "Staff email is required")
    @Email(message = "Enter a valid staff email")
    @Size(max = 255, message = "Staff email cannot exceed 255 characters")
    private String email;

    @NotBlank(message = "Temporary password is required")
    @Size(min = 8, max = 128, message = "Temporary password must contain 8 to 128 characters")
    private String password;

    @NotBlank(message = "License or staff number is required")
    @Size(max = 100, message = "License or staff number cannot exceed 100 characters")
    private String licenseNo;

    @NotNull(message = "Department is required")
    private UUID departmentId;

    @NotNull(message = "Staff role is required")
    private Role role;
}
