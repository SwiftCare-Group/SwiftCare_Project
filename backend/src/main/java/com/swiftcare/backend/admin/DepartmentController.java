package com.swiftcare.backend.admin;

import com.swiftcare.backend.appointment.Appointment;
import com.swiftcare.backend.appointment.AppointmentRepository;
import com.swiftcare.backend.appointment.dto.AppointmentResponse;
import com.swiftcare.backend.common.enums.AppointmentStatus;
import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.queue.QueueEntry;
import com.swiftcare.backend.queue.QueueEntryRepository;
import com.swiftcare.backend.common.enums.QueueStatus;
import com.swiftcare.backend.admin.dto.DepartmentResponse;
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
    private final AppointmentRepository appointmentRepository;
    private final QueueEntryRepository queueEntryRepository;

    @GetMapping
    public ResponseEntity<List<DepartmentResponse>> getAllDepartments() {
        List<DepartmentResponse> response = departmentRepository.findAllByIsActiveTrue()
                .stream()
                .map(d -> DepartmentResponse.builder()
                        .id(d.getId())
                        .hospitalId(d.getHospital().getId())
                        .hospitalName(d.getHospital().getName())
                        .name(d.getName())
                        .operatingHours(d.getOperatingHours())
                        .queueCapacity(d.getQueueCapacity())
                        .isActive(d.isActive())
                        .build())
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DepartmentResponse> getDepartment(@PathVariable UUID id) {
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));

        return ResponseEntity.ok(DepartmentResponse.builder()
                .id(department.getId())
                .hospitalId(department.getHospital().getId())
                .hospitalName(department.getHospital().getName())
                .name(department.getName())
                .operatingHours(department.getOperatingHours())
                .queueCapacity(department.getQueueCapacity())
                .isActive(department.isActive())
                .build());
    }

    @GetMapping("/{id}/slots")
    public ResponseEntity<List<LocalDateTime>> getAvailableSlots(@PathVariable UUID id) {
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));

        List<LocalDateTime> slots = new ArrayList<>();
        LocalDateTime start = LocalDateTime.now()
                .with(LocalTime.of(8, 0))
                .plusDays(1);

        for (int day = 0; day < 7; day++) {
            LocalDateTime slotTime = start.plusDays(day);
            for (int hour = 0; hour < 8; hour++) {
                slots.add(slotTime.plusHours(hour));
            }
        }

        return ResponseEntity.ok(slots);
    }

    @GetMapping("/{id}/queue")
    public ResponseEntity<List<AppointmentResponse>> getDepartmentQueue(
            @PathVariable UUID id) {

        List<Appointment> appointments = appointmentRepository
                .findAllByDepartmentIdAndStatusOrderBySeverityScoreDescScheduledTimeAsc(
                        id, AppointmentStatus.PENDING);

        List<AppointmentResponse> response = appointments.stream()
                .map(a -> AppointmentResponse.builder()
                        .id(a.getId())
                        .patientId(a.getPatient().getId())
                        .departmentId(a.getDepartment().getId())
                        .departmentName(a.getDepartment().getName())
                        .scheduledTime(a.getScheduledTime())
                        .queuePosition(a.getQueuePosition())
                        .severityScore(a.getSeverityScore())
                        .isEmergency(a.isEmergency())
                        .status(a.getStatus())
                        .createdAt(a.getCreatedAt())
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }
}