package com.swiftcare.backend.auth;

import com.swiftcare.backend.auth.dto.AuthResponse;
import com.swiftcare.backend.auth.dto.ForgotPasswordRequest;
import com.swiftcare.backend.auth.dto.LoginRequest;
import com.swiftcare.backend.auth.dto.RefreshTokenRequest;
import com.swiftcare.backend.auth.dto.RegisterRequest;
import com.swiftcare.backend.auth.dto.ResetPasswordRequest;
import com.swiftcare.backend.auth.dto.StaffAuthResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        AuthResponse response = authService.register(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request
    ) {
        AuthResponse response = authService.login(request);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/staff/login")
    public ResponseEntity<StaffAuthResponse> staffLogin(
            @Valid @RequestBody LoginRequest request
    ) {
        StaffAuthResponse response = authService.staffLogin(request);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(
            @Valid @RequestBody RefreshTokenRequest request
    ) {
        return ResponseEntity.ok(
                authService.refresh(request.getRefreshToken())
        );
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @Valid @RequestBody RefreshTokenRequest request
    ) {
        authService.logout(request.getRefreshToken());

        return ResponseEntity.noContent().build();
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Void> forgotPassword(
            @Valid @RequestBody ForgotPasswordRequest request
    ) {
        authService.forgotPassword(request);

        return ResponseEntity.ok().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Void> resetPassword(
            @Valid @RequestBody ResetPasswordRequest request
    ) {
        authService.resetPassword(request);

        return ResponseEntity.ok().build();
    }
}