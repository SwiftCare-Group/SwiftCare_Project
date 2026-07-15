package com.swiftcare.backend.auth;

import com.swiftcare.backend.auth.dto.AuthResponse;
import com.swiftcare.backend.auth.dto.LoginRequest;
import com.swiftcare.backend.auth.dto.RefreshTokenRequest;
import com.swiftcare.backend.auth.dto.RegisterRequest;
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
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refresh(request.getRefreshToken()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@Valid @RequestBody RefreshTokenRequest request) {
        authService.logout(request.getRefreshToken());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/staff-login")
    public ResponseEntity<StaffAuthResponse> staffLogin(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.staffLogin(request));
    }
}