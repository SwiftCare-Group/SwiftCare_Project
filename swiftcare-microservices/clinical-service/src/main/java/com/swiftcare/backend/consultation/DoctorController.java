package com.swiftcare.backend.consultation;

import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/doctors")
@RequiredArgsConstructor
public class DoctorController {

    private final DoctorRepository doctorRepository;

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getMe(
            @AuthenticationPrincipal String email
    ) {
        if (email == null || email.isBlank()) {
            throw new IllegalStateException(
                    "Authenticated staff email is unavailable"
            );
        }

        Doctor doctor = doctorRepository
                .findByEmailIgnoreCaseAndIsDeletedFalse(email.trim())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Authenticated staff account not found"
                ));

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", doctor.getId());
        response.put("name", doctor.getName());
        response.put("email", doctor.getEmail());
        response.put("role", doctor.getRole());
        response.put(
                "departmentId",
                doctor.getDepartment() == null
                        ? null
                        : doctor.getDepartment().getId()
        );
        response.put(
                "departmentName",
                doctor.getDepartment() == null
                        ? null
                        : doctor.getDepartment().getName()
        );

        return ResponseEntity.ok(response);
    }
}
