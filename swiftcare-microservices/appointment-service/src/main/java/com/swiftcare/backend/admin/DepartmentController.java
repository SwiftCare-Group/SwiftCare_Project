package com.swiftcare.backend.admin;

import com.swiftcare.backend.admin.dto.DepartmentResponse;
import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentRepository departmentRepository;

    @GetMapping
    public ResponseEntity<List<DepartmentResponse>> getAllDepartments() {

        List<DepartmentResponse> response =
                departmentRepository.findAllByIsActiveTrue()
                        .stream()
                        .map(this::mapToResponse)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DepartmentResponse> getDepartment(
            @PathVariable UUID id
    ) {
        Department department = departmentRepository.findById(id)
                .orElseThrow(
                        () -> new ResourceNotFoundException(
                                "Department not found"
                        )
                );

        return ResponseEntity.ok(
                mapToResponse(department)
        );
    }

    @GetMapping("/{id}/slots")
    public ResponseEntity<List<LocalDateTime>> getAvailableSlots(
            @PathVariable UUID id
    ) {
        Department department = departmentRepository.findById(id)
                .orElseThrow(
                        () -> new ResourceNotFoundException(
                                "Department not found"
                        )
                );

        List<LocalDateTime> slots = new ArrayList<>();

        LocalDateTime start = LocalDateTime.now()
                .with(LocalTime.of(8, 0))
                .withSecond(0)
                .withNano(0)
                .plusDays(1);

        for (int day = 0; day < 7; day++) {
            LocalDateTime dayStart = start.plusDays(day);

            for (int hour = 0; hour < 8; hour++) {
                slots.add(dayStart.plusHours(hour));
            }
        }

        return ResponseEntity.ok(slots);
    }

    private DepartmentResponse mapToResponse(
            Department department
    ) {
        return DepartmentResponse.builder()
                .id(department.getId())
                .hospitalId(
                        department.getHospital() != null
                                ? department.getHospital().getId()
                                : null
                )
                .hospitalName(
                        department.getHospital() != null
                                ? department.getHospital().getName()
                                : null
                )
                .name(department.getName())
                .operatingHours(
                        department.getOperatingHours()
                )
                .queueCapacity(
                        department.getQueueCapacity()
                )
                .isActive(department.isActive())
                .build();
    }
}