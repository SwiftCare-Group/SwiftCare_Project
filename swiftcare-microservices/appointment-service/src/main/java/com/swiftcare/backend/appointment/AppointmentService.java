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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AppointmentService {

    private static final int DEFAULT_CONSULTATION_MINUTES = 15;

    private final AppointmentRepository appointmentRepository;
    private final QueueEntryRepository queueEntryRepository;
    private final PatientRepository patientRepository;
    private final DepartmentRepository departmentRepository;

    @Transactional
    public AppointmentResponse bookAppointment(
            UUID patientId,
            AppointmentRequest request
    ) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(
                        () -> new ResourceNotFoundException(
                                "Patient not found"
                        )
                );

        Department department = departmentRepository
                .findById(request.getDepartmentId())
                .orElseThrow(
                        () -> new ResourceNotFoundException(
                                "Department not found"
                        )
                );

        validateAppointmentRequest(request);

        int queuePosition = calculateQueuePosition(
                patient,
                request.getDepartmentId(),
                request.getSeverityScore()
        );

        boolean emergency = request.getSeverityScore() >= 4;
        boolean premium = patient.getTier() == Tier.PREMIUM;

        Appointment appointment = Appointment.builder()
                .patient(patient)
                .department(department)
                .scheduledTime(request.getScheduledTime())
                .severityScore(request.getSeverityScore())
                .queuePosition(queuePosition)
                .isEmergency(emergency)
                .status(AppointmentStatus.PENDING)
                .build();

        Appointment savedAppointment =
                appointmentRepository.save(appointment);

        LocalDateTime estimatedCallTime =
                calculateEstimatedCallTime(
                        department,
                        request.getScheduledTime(),
                        queuePosition
                );

        QueueEntry queueEntry = QueueEntry.builder()
                .appointment(savedAppointment)

                // Patient information
                .patientId(patient.getId())
                .patientName(patient.getName())
                .patientNumber(patient.getPhone())
                .age(calculateAge(patient.getDateOfBirth()))

                // Department information
                .departmentId(department.getId())

                // Queue priority information
                .severityScore(request.getSeverityScore())
                .severityLabel(
                        calculateSeverityLabel(
                                request.getSeverityScore()
                        )
                )
                .premium(premium)
                .emergency(emergency)

                // Queue time and position
                .scheduledTime(request.getScheduledTime())
                .currentPosition(queuePosition)
                .estimatedCallTime(estimatedCallTime)

                // Queue status
                .status(QueueStatus.WAITING)

                // Timestamps
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        queueEntryRepository.save(queueEntry);

        return mapToResponse(savedAppointment);
    }

    @Transactional(readOnly = true)
    public List<AppointmentResponse> getPatientAppointments(
            UUID patientId
    ) {
        return appointmentRepository
                .findAllByPatientIdOrderByCreatedAtDesc(patientId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public AppointmentResponse getAppointment(UUID appointmentId) {
        Appointment appointment = appointmentRepository
                .findById(appointmentId)
                .orElseThrow(
                        () -> new ResourceNotFoundException(
                                "Appointment not found"
                        )
                );

        return mapToResponse(appointment);
    }

    @Transactional(readOnly = true)
    public QueueStatusResponse getQueueStatus(UUID appointmentId) {
        QueueEntry entry = queueEntryRepository
                .findByAppointmentId(appointmentId)
                .orElseThrow(
                        () -> new ResourceNotFoundException(
                                "Queue entry not found"
                        )
                );

        String queueStatus = entry.getStatus() != null
                ? entry.getStatus().name()
                : QueueStatus.WAITING.name();

        return QueueStatusResponse.builder()
                .appointmentId(appointmentId)
                .currentPosition(entry.getCurrentPosition())
                .estimatedCallTime(entry.getEstimatedCallTime())
                .isEmergency(entry.isEmergency())
                .status(queueStatus)
                .build();
    }

    @Transactional
    public AppointmentResponse cancelAppointment(UUID appointmentId) {
        Appointment appointment = appointmentRepository
                .findById(appointmentId)
                .orElseThrow(
                        () -> new ResourceNotFoundException(
                                "Appointment not found"
                        )
                );

        if (appointment.getStatus() == AppointmentStatus.CANCELLED) {
            throw new IllegalStateException(
                    "This appointment has already been cancelled."
            );
        }

        appointment.setStatus(AppointmentStatus.CANCELLED);
        Appointment savedAppointment =
                appointmentRepository.save(appointment);

        queueEntryRepository
                .findByAppointmentId(appointmentId)
                .ifPresent(entry -> {
                    entry.setStatus(QueueStatus.CANCELLED);
                    entry.setUpdatedAt(LocalDateTime.now());
                    queueEntryRepository.save(entry);
                });

        recalculateQueuePositions(
                appointment.getDepartment().getId()
        );

        return mapToResponse(savedAppointment);
    }

    private int calculateQueuePosition(
            Patient patient,
            UUID departmentId,
            int severityScore
    ) {
        List<Appointment> activeAppointments =
                appointmentRepository
                        .findAllByDepartmentIdAndStatusOrderBySeverityScoreDescScheduledTimeAsc(
                                departmentId,
                                AppointmentStatus.PENDING
                        );

        int position = 1;

        for (Appointment existing : activeAppointments) {
            if (existing.getSeverityScore() > severityScore) {
                position++;
                continue;
            }

            if (existing.getSeverityScore() == severityScore) {
                boolean existingPatientIsPremium =
                        existing.getPatient().getTier()
                                == Tier.PREMIUM;

                boolean newPatientIsPremium =
                        patient.getTier() == Tier.PREMIUM;

                if (existingPatientIsPremium
                        && !newPatientIsPremium) {
                    position++;
                }
            }
        }

        return position;
    }

    private LocalDateTime calculateEstimatedCallTime(
            Department department,
            LocalDateTime scheduledTime,
            int position
    ) {
        LocalDateTime startingTime = scheduledTime;

        if (startingTime == null) {
            startingTime = LocalDateTime.now();
        }

        /*
         * When operating hours are unavailable or incorrectly formatted,
         * use the appointment time instead of crashing the request.
         */
        if (department.getOperatingHours() == null
                || department.getOperatingHours().isBlank()) {
            return startingTime.plusMinutes(
                    (long) Math.max(position - 1, 0)
                            * DEFAULT_CONSULTATION_MINUTES
            );
        }

        try {
            String[] hours =
                    department.getOperatingHours().split(" - ");

            String[] openingTime =
                    hours[0].trim().split(":");

            int openingHour =
                    Integer.parseInt(openingTime[0]);

            int openingMinute =
                    Integer.parseInt(openingTime[1]);

            LocalDateTime departmentOpeningTime =
                    startingTime
                            .withHour(openingHour)
                            .withMinute(openingMinute)
                            .withSecond(0)
                            .withNano(0);

            LocalDateTime queueStartTime =
                    startingTime.isAfter(departmentOpeningTime)
                            ? startingTime
                            : departmentOpeningTime;

            return queueStartTime.plusMinutes(
                    (long) Math.max(position - 1, 0)
                            * DEFAULT_CONSULTATION_MINUTES
            );

        } catch (RuntimeException exception) {
            return startingTime.plusMinutes(
                    (long) Math.max(position - 1, 0)
                            * DEFAULT_CONSULTATION_MINUTES
            );
        }
    }

    private void recalculateQueuePositions(UUID departmentId) {
        List<Appointment> activeAppointments =
                appointmentRepository
                        .findAllByDepartmentIdAndStatusOrderBySeverityScoreDescScheduledTimeAsc(
                                departmentId,
                                AppointmentStatus.PENDING
                        );

        for (int index = 0;
             index < activeAppointments.size();
             index++) {

            Appointment appointment =
                    activeAppointments.get(index);

            int newPosition = index + 1;

            appointment.setQueuePosition(newPosition);
            appointmentRepository.save(appointment);

            queueEntryRepository
                    .findByAppointmentId(appointment.getId())
                    .ifPresent(entry -> {
                        entry.setCurrentPosition(newPosition);

                        entry.setEstimatedCallTime(
                                calculateEstimatedCallTime(
                                        appointment.getDepartment(),
                                        appointment.getScheduledTime(),
                                        newPosition
                                )
                        );

                        entry.setUpdatedAt(LocalDateTime.now());

                        queueEntryRepository.save(entry);
                    });
        }
    }

    private AppointmentResponse mapToResponse(
            Appointment appointment
    ) {
        return AppointmentResponse.builder()
                .id(appointment.getId())
                .patientId(appointment.getPatient().getId())
                .departmentId(
                        appointment.getDepartment().getId()
                )
                .departmentName(
                        appointment.getDepartment().getName()
                )
                .scheduledTime(appointment.getScheduledTime())
                .queuePosition(appointment.getQueuePosition())
                .severityScore(appointment.getSeverityScore())
                .isEmergency(appointment.isEmergency())
                .status(appointment.getStatus())
                .createdAt(appointment.getCreatedAt())
                .build();
    }

    private void validateAppointmentRequest(
            AppointmentRequest request
    ) {
        if (request == null) {
            throw new IllegalArgumentException(
                    "Appointment request is required."
            );
        }

        if (request.getDepartmentId() == null) {
            throw new IllegalArgumentException(
                    "Department ID is required."
            );
        }

        if (request.getScheduledTime() == null) {
            throw new IllegalArgumentException(
                    "Scheduled time is required."
            );
        }

        int severityScore = request.getSeverityScore();

        if (severityScore < 1 || severityScore > 4) {
            throw new IllegalArgumentException(
                    "Severity score must be between 1 and 4."
            );
        }
    }

    private Integer calculateAge(LocalDate dateOfBirth) {
        if (dateOfBirth == null) {
            return null;
        }

        return Period.between(
                dateOfBirth,
                LocalDate.now()
        ).getYears();
    }

    private String calculateSeverityLabel(int severityScore) {
        return switch (severityScore) {
            case 4 -> "EMERGENCY";
            case 3 -> "SEVERE";
            case 2 -> "MODERATE";
            default -> "MILD";
        };
    }
}