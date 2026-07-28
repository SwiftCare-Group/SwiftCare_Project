package com.swiftcare.backend.admin;

import com.swiftcare.backend.admin.dto.StaffResponse;
import com.swiftcare.backend.common.enums.Role;
import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.common.security.AdminRequired;
import com.swiftcare.backend.consultation.Doctor;
import com.swiftcare.backend.consultation.DoctorRepository;
import com.swiftcare.backend.patient.PatientRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminDoctorController {

    private final DepartmentRepository departmentRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping("/staff")
    @AdminRequired
    public List<StaffResponse> listStaff() {
        return doctorRepository
                .findAllByIsDeletedFalseOrderByNameAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @PostMapping("/doctors")
    @AdminRequired
    public ResponseEntity<StaffResponse> createDoctor(
            @Valid @RequestBody CreateDoctorRequest request
    ) {
        String normalizedEmail = request.getEmail()
                .trim()
                .toLowerCase(Locale.ROOT);

        if (doctorRepository.existsByEmailIgnoreCase(normalizedEmail)
                || patientRepository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new IllegalArgumentException(
                    "A staff account with this email already exists"
            );
        }

        String normalizedLicense = request.getLicenseNo()
                .trim()
                .toUpperCase(Locale.ROOT);

        if (doctorRepository.existsByLicenseNoIgnoreCase(normalizedLicense)) {
            throw new IllegalArgumentException(
                    "A staff account with this license or staff number already exists"
            );
        }

        Role requestedRole = request.getRole();
        if (requestedRole != Role.DOCTOR
                && requestedRole != Role.PHARMACIST
                && requestedRole != Role.LAB_TECHNICIAN) {
            throw new IllegalArgumentException(
                    "Only doctor, pharmacist, and lab technician accounts can be created here"
            );
        }

        Department department = departmentRepository
                .findByIdAndIsActiveTrue(request.getDepartmentId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Active department not found"
                ));

        Doctor saved = doctorRepository.saveAndFlush(
                Doctor.builder()
                        .name(request.getName().trim())
                        .email(normalizedEmail)
                        .passwordHash(passwordEncoder.encode(request.getPassword()))
                        .licenseNo(normalizedLicense)
                        .department(department)
                        .role(requestedRole)
                        .isAvailableOnline(requestedRole == Role.DOCTOR)
                        .isDeleted(false)
                        .build()
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(toResponse(saved));
    }

    private StaffResponse toResponse(Doctor staff) {
        Department department = staff.getDepartment();
        return StaffResponse.builder()
                .id(staff.getId())
                .name(safeText(staff.getName(), "Unnamed staff"))
                .email(safeText(staff.getEmail(), ""))
                .licenseNo(safeText(staff.getLicenseNo(), "Not assigned"))
                .departmentId(department == null ? null : department.getId())
                .departmentName(
                        department == null
                                ? "Unassigned department"
                                : safeText(department.getName(), "Unnamed department")
                )
                .role(staff.getRole() == null ? Role.DOCTOR : staff.getRole())
                .availableOnline(staff.isAvailableOnline())
                .build();
    }

    private String safeText(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
