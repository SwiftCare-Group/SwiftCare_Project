package com.swiftcare.backend.admin;

import com.swiftcare.backend.admin.dto.DepartmentResponse;
import com.swiftcare.backend.appointment.AppointmentRepository;
import com.swiftcare.backend.common.enums.AppointmentStatus;
import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.common.security.AdminRequired;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {

    private final DepartmentRepository departmentRepository;
    private final HospitalRepository hospitalRepository;
    private final AppointmentRepository appointmentRepository;

    @PostMapping("/departments")
    @AdminRequired
    public ResponseEntity<DepartmentResponse> createDepartment(
            @Valid @RequestBody CreateDepartmentRequest request
    ) {
        Hospital hospital = hospitalRepository
                .findAllByIsActiveTrue()
                .stream()
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No active hospital found"
                ));

        String departmentName = request.getName().trim();
        String operatingHours = request.getOperatingHours().trim();
        validateOperatingHours(operatingHours);

        if (departmentRepository.existsByHospitalIdAndNameIgnoreCase(
                hospital.getId(),
                departmentName
        )) {
            throw new IllegalArgumentException(
                    "An active or inactive department with this name already exists"
            );
        }

        Department saved = departmentRepository.save(
                Department.builder()
                        .hospital(hospital)
                        .name(departmentName)
                        .operatingHours(operatingHours)
                        .queueCapacity(request.getQueueCapacity())
                        .build()
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
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

    private void validateOperatingHours(String operatingHours) {
        String[] parts = operatingHours.split("\\s*-\\s*");
        LocalTime opening = LocalTime.parse(parts[0]);
        LocalTime closing = LocalTime.parse(parts[1]);

        if (!closing.isAfter(opening)) {
            throw new IllegalArgumentException(
                    "Department closing time must be after opening time"
            );
        }
    }

    @GetMapping("/stats")
    @AdminRequired
    public ResponseEntity<Map<String, Long>> getDashboardStats() {
        Map<String, Long> stats = new LinkedHashMap<>();
        stats.put("totalDepartments", departmentRepository.count());
        stats.put("activeDepartments", departmentRepository.countByIsActiveTrue());
        stats.put(
                "pendingAppointments",
                appointmentRepository.countByStatus(AppointmentStatus.PENDING)
        );
        stats.put(
                "completedAppointments",
                appointmentRepository.countByStatus(AppointmentStatus.COMPLETED)
        );

        return ResponseEntity.ok(stats);
    }
}
