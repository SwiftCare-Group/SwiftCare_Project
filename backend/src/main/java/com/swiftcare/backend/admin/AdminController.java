package com.swiftcare.backend.admin;

import com.swiftcare.backend.consultation.Doctor;
import com.swiftcare.backend.consultation.DoctorRepository;
import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.common.security.AdminRequired;
import com.swiftcare.backend.admin.dto.DepartmentResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.Map;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {

    private final DepartmentRepository departmentRepository;
    private final HospitalRepository hospitalRepository;
    private final DoctorRepository doctorRepository;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/departments")
    @AdminRequired
    public ResponseEntity<DepartmentResponse> createDepartment(
            @RequestBody CreateDepartmentRequest request) {

        Hospital hospital = hospitalRepository.findAllByIsActiveTrue()
                .stream()
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("No active hospital found"));

        Department department = Department.builder()
                .hospital(hospital)
                .name(request.getName())
                .operatingHours(request.getOperatingHours())
                .queueCapacity(request.getQueueCapacity())
                .build();

        Department saved = departmentRepository.save(department);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(DepartmentResponse.builder()
                        .id(saved.getId())
                        .hospitalId(hospital.getId())
                        .hospitalName(hospital.getName())
                        .name(saved.getName())
                        .operatingHours(saved.getOperatingHours())
                        .queueCapacity(saved.getQueueCapacity())
                        .isActive(saved.isActive())
                        .build());
     }

    @PostMapping("/doctors")
    @AdminRequired
    public ResponseEntity<Map<String, Object>> createDoctor(
            @RequestBody CreateDoctorRequest request) {

        Department department = departmentRepository.findById(request.getDepartmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));

        Doctor doctor = Doctor.builder()
                .name(request.getName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .licenseNo(request.getLicenseNo())
                .department(department)
                .build();

        Doctor saved = doctorRepository.save(doctor);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of(
                        "id", saved.getId(),
                        "name", saved.getName(),
                        "email", saved.getEmail(),
                        "licenseNo", saved.getLicenseNo(),
                        "departmentId", department.getId(),
                        "departmentName", department.getName(),
                        "isAvailableOnline", saved.isAvailableOnline()
                ));
    }
}