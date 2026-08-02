package com.swiftcare.backend.admin;

import com.swiftcare.backend.admin.dto.DepartmentResponse;
import com.swiftcare.backend.appointment.Appointment;
import com.swiftcare.backend.appointment.AppointmentRepository;
import com.swiftcare.backend.common.enums.AppointmentStatus;
import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private static final int SLOT_MINUTES = 30;
    private static final int DAYS_TO_SHOW = 7;
    private static final List<AppointmentStatus> BOOKED_STATUSES = List.of(
            AppointmentStatus.PENDING,
            AppointmentStatus.ACTIVE
    );

    private final DepartmentRepository departmentRepository;
    private final AppointmentRepository appointmentRepository;

    @GetMapping
    public ResponseEntity<List<DepartmentResponse>> getAllDepartments() {
        List<DepartmentResponse> response = departmentRepository
                .findAllByIsActiveTrue()
                .stream()
                .map(this::mapToResponse)
                .toList();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DepartmentResponse> getDepartment(
            @PathVariable UUID id
    ) {
        Department department = departmentRepository
                .findByIdAndIsActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Active department not found"
                ));

        return ResponseEntity.ok(mapToResponse(department));
    }

    @GetMapping("/{id}/slots")
    public ResponseEntity<List<LocalDateTime>> getAvailableSlots(
            @PathVariable UUID id
    ) {
        Department department = departmentRepository
                .findByIdAndIsActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Active department not found"
                ));

        LocalTime[] hours = parseOperatingHours(department.getOperatingHours());
        LocalDate today = LocalDate.now();
        LocalDateTime rangeStart = today.atStartOfDay();
        LocalDateTime rangeEnd = rangeStart.plusDays(DAYS_TO_SHOW);

        Set<LocalDateTime> bookedTimes = new HashSet<>(
                appointmentRepository
                        .findAllByDepartmentIdAndScheduledTimeBetweenAndStatusIn(
                                id,
                                rangeStart,
                                rangeEnd,
                                BOOKED_STATUSES
                        )
                        .stream()
                        .map(Appointment::getScheduledTime)
                        .toList()
        );

        List<LocalDateTime> slots = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (int dayOffset = 0; dayOffset < DAYS_TO_SHOW; dayOffset++) {
            LocalDate date = today.plusDays(dayOffset);
            LocalDateTime dayStart = date.atStartOfDay();
            LocalDateTime dayEnd = dayStart.plusDays(1);

            long bookedForDay = appointmentRepository
                    .countByDepartmentIdAndScheduledTimeBetweenAndStatusIn(
                            id,
                            dayStart,
                            dayEnd,
                            BOOKED_STATUSES
                    );

            if (bookedForDay >= department.getQueueCapacity()) {
                continue;
            }

            LocalDateTime slot = LocalDateTime.of(date, hours[0]);
            LocalDateTime closing = LocalDateTime.of(date, hours[1]);

            while (slot.isBefore(closing)) {
                if (slot.isAfter(now) && !bookedTimes.contains(slot)) {
                    slots.add(slot);
                }
                slot = slot.plusMinutes(SLOT_MINUTES);
            }
        }

        return ResponseEntity.ok(slots);
    }

    private LocalTime[] parseOperatingHours(String operatingHours) {
        if (operatingHours == null || operatingHours.isBlank()) {
            throw new IllegalStateException(
                    "Department operating hours are not configured"
            );
        }

        try {
            String[] parts = operatingHours.split("\\s*-\\s*");
            LocalTime opening = LocalTime.parse(parts[0].trim());
            LocalTime closing = LocalTime.parse(parts[1].trim());

            if (!closing.isAfter(opening)) {
                throw new IllegalStateException(
                        "Department closing time must be after opening time"
                );
            }

            return new LocalTime[]{opening, closing};
        } catch (RuntimeException exception) {
            if (exception instanceof IllegalStateException illegalStateException) {
                throw illegalStateException;
            }
            throw new IllegalStateException(
                    "Department operating hours are invalid"
            );
        }
    }

    private DepartmentResponse mapToResponse(Department department) {
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
                .operatingHours(department.getOperatingHours())
                .queueCapacity(department.getQueueCapacity())
                .isActive(department.isActive())
                .build();
    }
}
