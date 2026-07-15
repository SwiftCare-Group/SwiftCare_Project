package com.swiftcare.backend.patient;

import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import java.util.LinkedHashMap;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientRepository patientRepository;

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMe(
            @AuthenticationPrincipal String email) {

        Patient patient = findPatientByEmail(email);

        return ResponseEntity.ok(toResponse(patient));
    }

    @PutMapping("/me")
    public ResponseEntity<Map<String, Object>> updateMe(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody UpdatePatientRequest request) {

        Patient patient = findPatientByEmail(email);

        patient.setName(request.getName().trim());
        patient.setPhone(request.getPhone().trim());

        Patient updatedPatient = patientRepository.save(patient);

        return ResponseEntity.ok(toResponse(updatedPatient));
    }

    private Patient findPatientByEmail(String email) {
        return patientRepository.findByEmail(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Patient not found")
                );
    }

private Map<String, Object> toResponse(Patient patient) {
    Map<String, Object> response = new LinkedHashMap<>();

    response.put("id", patient.getId());
    response.put("name", patient.getName());
    response.put("email", patient.getEmail());
    response.put("phone", patient.getPhone());
    response.put("tier", patient.getTier());
    response.put("role", patient.getRole());
    response.put("createdAt", patient.getCreatedAt());

    return response;
}
private final PasswordEncoder passwordEncoder;

@PutMapping("/me/password")
public ResponseEntity<Map<String, String>> changePassword(
        @AuthenticationPrincipal String email,
        @Valid @RequestBody ChangePasswordRequest request) {

    Patient patient = findPatientByEmail(email);

    if (!passwordEncoder.matches(
            request.getCurrentPassword(),
            patient.getPasswordHash()
    )) {
        return ResponseEntity.badRequest().body(
                Map.of("message", "Current password is incorrect")
        );
    }

    if (passwordEncoder.matches(
            request.getNewPassword(),
            patient.getPasswordHash()
    )) {
        return ResponseEntity.badRequest().body(
                Map.of(
                        "message",
                        "New password must be different from the current password"
                )
        );
    }

    patient.setPasswordHash(
            passwordEncoder.encode(request.getNewPassword())
    );

    patientRepository.save(patient);

    return ResponseEntity.ok(
            Map.of("message", "Password changed successfully")
    );
}
}