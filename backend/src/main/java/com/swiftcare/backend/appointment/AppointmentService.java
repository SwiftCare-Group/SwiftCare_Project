package com.swiftcare.backend.appointment;

import com.swiftcare.backend.admin.Department;
import com.swiftcare.backend.admin.DepartmentRepository;
import com.swiftcare.backend.appointment.dto.AppointmentRequest;
import com.swiftcare.backend.appointment.dto.AppointmentResponse;
import com.swiftcare.backend.appointment.dto.QueueStatusResponse;
import com.swiftcare.backend.common.enums.AppointmentStatus;
import com.swiftcare.backend.common.enums.QueueStatus;
import com.swiftcare.backend.common.enums.Tier;
import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.patient.Patient;
import com.swiftcare.backend.patient.PatientRepository;
import com.swiftcare.backend.queue.QueueEntry;
import com.swiftcare.backend.queue.QueueEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final QueueEntryRepository queueEntryRepository;
    private final PatientRepository patientRepository;
    private final DepartmentRepository departmentRepository;

    @Transactional
    public AppointmentResponse bookAppointment(UUID patientId, AppointmentRequest request) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));

        Department department = departmentRepository.findById(request.getDepartmentId())
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));

        int queuePosition = calculateQueuePosition(
                patient, request.getDepartmentId(), request.getSeverityScore());

        Appointment appointment = Appointment.builder()
                .patient(patient)
                .department(department)
                .scheduledTime(request.getScheduledTime())
                .severityScore(request.getSeverityScore())
                .queuePosition(queuePosition)
                .build();

        Appointment saved = appointmentRepository.save(appointment);

        QueueEntry queueEntry = QueueEntry.builder()
                .appointment(saved)
                .currentPosition(queuePosition)
                .estimatedCallTime(calculateEstimatedCallTime(
                        department, queuePosition, request.getScheduledTime()))
                .build();

        queueEntryRepository.save(queueEntry);

        return mapToResponse(saved);
    }

    public List<AppointmentResponse> getPatientAppointments(UUID patientId) {
        return appointmentRepository
                .findAllByPatientIdOrderByCreatedAtDesc(patientId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public AppointmentResponse getAppointment(UUID appointmentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found"));
        return mapToResponse(appointment);
    }

    public QueueStatusResponse getQueueStatus(UUID appointmentId) {
        QueueEntry entry = queueEntryRepository.findByAppointmentId(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Queue entry not found"));

        return QueueStatusResponse.builder()
                .appointmentId(appointmentId)
                .currentPosition(entry.getCurrentPosition())
                .estimatedCallTime(entry.getEstimatedCallTime())
                .isEmergency(entry.isEmergency())
                .status(entry.getStatus().name())
                .build();
    }

    @Transactional
    public AppointmentResponse cancelAppointment(UUID appointmentId) {
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found"));

        appointment.setStatus(AppointmentStatus.CANCELLED);
        appointmentRepository.save(appointment);

        queueEntryRepository.findByAppointmentId(appointmentId).ifPresent(entry -> {
            entry.setStatus(QueueStatus.CANCELLED);
            queueEntryRepository.save(entry);
        });

        recalculateQueuePositions(appointment.getDepartment().getId());

        return mapToResponse(appointment);
    }

    private int calculateQueuePosition(Patient patient, UUID departmentId, int severityScore) {
        List<Appointment> active = appointmentRepository
                .findAllByDepartmentIdAndStatusOrderBySeverityScoreDescScheduledTimeAsc(
                        departmentId, AppointmentStatus.PENDING);

        int position = 1;
        for (Appointment existing : active) {
            if (existing.getSeverityScore() > severityScore) {
                position++;
            } else if (existing.getSeverityScore() == severityScore) {
                if (existing.getPatient().getTier() == Tier.PREMIUM
                        && patient.getTier() != Tier.PREMIUM) {
                    position++;
                }
            }
        }
        return position;
    }

    private LocalDateTime calculateEstimatedCallTime(Department department, int position, LocalDateTime scheduledTime) {
        // Parse department opening hour from operatingHours string e.g. "08:00 - 17:00"
        String[] hours = department.getOperatingHours().split(" - ");
        String[] openTime = hours[0].trim().split(":");
        int openHour = Integer.parseInt(openTime[0]);
        int openMin = Integer.parseInt(openTime[1]);

        LocalDateTime departmentOpen = LocalDateTime.now()
                .withHour(openHour)
                .withMinute(openMin)
                .withSecond(0)
                .withNano(0);

        // If department opens tomorrow (already past today's opening)
        if (LocalDateTime.now().isAfter(departmentOpen)) {
            departmentOpen = departmentOpen.plusDays(1);
        }

            return scheduledTime.plusMinutes((long) (position - 1) * 15);
    }

    private void recalculateQueuePositions(UUID departmentId) {
        List<Appointment> active = appointmentRepository
                .findAllByDepartmentIdAndStatusOrderBySeverityScoreDescScheduledTimeAsc(
                        departmentId, AppointmentStatus.PENDING);

        for (int i = 0; i < active.size(); i++) {
            Appointment appointment = active.get(i);
            appointment.setQueuePosition(i + 1);
            appointmentRepository.save(appointment);

            queueEntryRepository.findByAppointmentId(appointment.getId())
                    .ifPresent(entry -> {
                        entry.setCurrentPosition(appointment.getQueuePosition());
                        entry.setEstimatedCallTime(
                                calculateEstimatedCallTime(
                                        appointment.getDepartment(),
                                        appointment.getQueuePosition(),
                                        appointment.getScheduledTime()));
                        queueEntryRepository.save(entry);
                    });
        }
    }

    private AppointmentResponse mapToResponse(Appointment appointment) {
        return AppointmentResponse.builder()
                .id(appointment.getId())
                .patientId(appointment.getPatient().getId())
                .departmentId(appointment.getDepartment().getId())
                .departmentName(appointment.getDepartment().getName())
                .scheduledTime(appointment.getScheduledTime())
                .queuePosition(appointment.getQueuePosition())
                .severityScore(appointment.getSeverityScore())
                .isEmergency(appointment.isEmergency())
                .status(appointment.getStatus())
                .createdAt(appointment.getCreatedAt())
                .build();
    }
}