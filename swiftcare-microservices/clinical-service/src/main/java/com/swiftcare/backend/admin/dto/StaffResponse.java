package com.swiftcare.backend.admin.dto;

import com.swiftcare.backend.common.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffResponse {
    private UUID id;
    private String name;
    private String email;
    private String licenseNo;
    private UUID departmentId;
    private String departmentName;
    private Role role;
    private boolean availableOnline;
}
