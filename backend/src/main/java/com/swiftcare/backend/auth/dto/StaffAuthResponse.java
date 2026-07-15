package com.swiftcare.backend.auth.dto;

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
public class StaffAuthResponse {
    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private UUID staffId;
    private String name;
    private String email;
    private Role role;
}