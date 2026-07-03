package com.swiftcare.backend.admin;

import com.swiftcare.backend.consultation.Doctor;
import com.swiftcare.backend.consultation.DoctorRepository;
import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.common.security.AdminRequired;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

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
    public ResponseEntity<Department> createDepartment(
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

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(departmentRepository.save(department));
    }

    @PostMapping("/doctors")
    @AdminRequired
    public ResponseEntity<Doctor> createDoctor(
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

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(doctorRepository.save(doctor));
    }
}