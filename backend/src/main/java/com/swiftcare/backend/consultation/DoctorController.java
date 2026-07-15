package com.swiftcare.backend.consultation;

import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/doctors")
@RequiredArgsConstructor
public class DoctorController {

    private final DoctorRepository doctorRepository;

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMe(
            @AuthenticationPrincipal String email) {

        Doctor doctor = doctorRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found"));

        return ResponseEntity.ok(Map.of(
                "id", doctor.getId(),
                "name", doctor.getName(),
                "email", doctor.getEmail(),
                "role", doctor.getRole(),
                "departmentId", doctor.getDepartment().getId(),
                "departmentName", doctor.getDepartment().getName()
        ));
    }
}