package com.swiftcare.backend.admin;

import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.common.security.AdminRequired;
import com.swiftcare.backend.consultation.Doctor;
import com.swiftcare.backend.consultation.DoctorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminDoctorController {
    private final DepartmentRepository departmentRepository;
    private final DoctorRepository doctorRepository;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/doctors")
    @AdminRequired
    public ResponseEntity<Map<String, Object>> createDoctor(@RequestBody CreateDoctorRequest request) {
        Department department = departmentRepository.findById(request.getDepartmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));
        Doctor saved = doctorRepository.save(Doctor.builder()
                .name(request.getName()).email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .licenseNo(request.getLicenseNo()).department(department).build());
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "id", saved.getId(), "name", saved.getName(), "email", saved.getEmail(),
                "licenseNo", saved.getLicenseNo(), "departmentId", department.getId(),
                "departmentName", department.getName(), "isAvailableOnline", saved.isAvailableOnline()));
    }
}
