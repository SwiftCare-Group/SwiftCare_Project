package com.swiftcare.backend.queue;

import com.swiftcare.backend.appointment.Appointment;
import com.swiftcare.backend.common.enums.AppointmentStatus;
import com.swiftcare.backend.common.enums.QueueStatus;
import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.queue.dto.QueueEntryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class QueueService {

    private static final int DEFAULT_CONSULTATION_MINUTES = 15;

    private final QueueEntryRepository queueEntryRepository;

    @Transactional(readOnly = true)
    public List<DoctorQueueResponse> getDepartmentQueue(
            UUID departmentId
    ) {
        List<QueueEntry> entries =
                queueEntryRepository
                        .findByDepartmentIdAndStatusInOrderBySeverityScoreDescPremiumDescScheduledTimeAsc(
                                departmentId,
                                List.of(
                                        QueueStatus.WAITING,
                                        QueueStatus.CALLED,
                                        QueueStatus.IN_CONSULTATION
                                )
                        );

        /*
         * Display patients in this order:
         * 1. IN_CONSULTATION
         * 2. CALLED
         * 3. WAITING
         */
        entries.sort(
                (first, second) ->
                        Integer.compare(
                                getStatusPriority(first.getStatus()),
                                getStatusPriority(second.getStatus())
                        )
        );

        List<DoctorQueueResponse> responses =
                new ArrayList<>();

        int waitingPosition = 1;

        for (QueueEntry entry : entries) {
            boolean waiting =
                    entry.getStatus() == QueueStatus.WAITING;

            int queuePosition;

            if (waiting) {
                queuePosition = waitingPosition;
                waitingPosition++;
            } else {
                queuePosition = 0;
            }

            int estimatedWaitMinutes =
                    waiting
                            ? (queuePosition - 1)
                            * DEFAULT_CONSULTATION_MINUTES
                            : 0;

            responses.add(
                    mapToDoctorQueueResponse(
                            entry,
                            queuePosition,
                            estimatedWaitMinutes
                    )
            );
        }

        return responses;
    }

    @Transactional(readOnly = true)
    public QueueEntryResponse getQueueEntry(
            UUID queueEntryId
    ) {
        QueueEntry queueEntry =
                queueEntryRepository
                        .findById(queueEntryId)
                        .orElseThrow(
                                () -> new ResourceNotFoundException(
                                        "Queue entry not found"
                                )
                        );

        return mapToResponse(queueEntry);
    }

    @Transactional
    public QueueEntry createQueueEntry(
            Appointment appointment,
            UUID patientId,
            UUID departmentId,
            String patientName,
            String patientNumber,
            Integer age,
            String gender,
            String chiefComplaint,
            Integer severityScore,
            LocalDateTime scheduledTime,
            Boolean premium
    ) {
        validateSeverityScore(severityScore);

        if (appointment == null) {
            throw new IllegalArgumentException(
                    "Appointment is required when creating a queue entry."
            );
        }

        if (departmentId == null) {
            throw new IllegalArgumentException(
                    "Department ID is required."
            );
        }

        LocalDateTime now = LocalDateTime.now();

        QueueEntry entry = QueueEntry.builder()
                .appointment(appointment)
                .patientId(patientId)
                .departmentId(departmentId)
                .patientName(patientName)
                .patientNumber(patientNumber)
                .age(age)
                .gender(gender)
                .chiefComplaint(chiefComplaint)
                .severityScore(severityScore)
                .severityLabel(
                        calculateSeverityLabel(severityScore)
                )
                .scheduledTime(scheduledTime)
                .currentPosition(0)
                .premium(Boolean.TRUE.equals(premium))
                .emergency(severityScore >= 9)
                .status(QueueStatus.WAITING)
                .createdAt(now)
                .updatedAt(now)
                .build();

        return queueEntryRepository.save(entry);
    }

    @Transactional
    public QueueEntry callPatient(UUID queueEntryId) {
        QueueEntry entry = findQueueEntry(queueEntryId);

        ensurePatientIsWaiting(entry);

        entry.setStatus(QueueStatus.CALLED);
        entry.setUpdatedAt(LocalDateTime.now());

        return queueEntryRepository.save(entry);
    }

    @Transactional
    public QueueEntry startConsultation(UUID queueEntryId) {
        QueueEntry entry = findQueueEntry(queueEntryId);

        if (entry.getStatus() == QueueStatus.COMPLETED) {
            throw new IllegalStateException(
                    "This consultation has already been completed."
            );
        }

        if (entry.getStatus() == QueueStatus.CANCELLED) {
            throw new IllegalStateException(
                    "A cancelled queue entry cannot start consultation."
            );
        }

        if (entry.getStatus() != QueueStatus.CALLED) {
            throw new IllegalStateException(
                    "The patient must be called before consultation can start."
            );
        }

        entry.setStatus(QueueStatus.IN_CONSULTATION);
        entry.setUpdatedAt(LocalDateTime.now());

        return queueEntryRepository.save(entry);
    }

    @Transactional
    public QueueEntry completeConsultation(UUID queueEntryId) {
        QueueEntry entry = findQueueEntry(queueEntryId);

        if (entry.getStatus() == QueueStatus.COMPLETED) {
            throw new IllegalStateException(
                    "This consultation has already been completed."
            );
        }

        if (entry.getStatus() == QueueStatus.CANCELLED) {
            throw new IllegalStateException(
                    "A cancelled queue entry cannot be completed."
            );
        }

        if (entry.getStatus()
                != QueueStatus.IN_CONSULTATION) {
            throw new IllegalStateException(
                    "The consultation must be started before it can be completed."
            );
        }

        entry.setStatus(QueueStatus.COMPLETED);
        entry.setUpdatedAt(LocalDateTime.now());

        Appointment appointment = entry.getAppointment();

        if (appointment != null) {
            appointment.setStatus(
                    AppointmentStatus.COMPLETED
            );
        }

        return queueEntryRepository.save(entry);
    }

    @Transactional
    public QueueEntry cancelQueueEntry(UUID queueEntryId) {
        QueueEntry entry = findQueueEntry(queueEntryId);

        if (entry.getStatus() == QueueStatus.COMPLETED) {
            throw new IllegalStateException(
                    "A completed queue entry cannot be cancelled."
            );
        }

        if (entry.getStatus() == QueueStatus.CANCELLED) {
            throw new IllegalStateException(
                    "This queue entry has already been cancelled."
            );
        }

        entry.setStatus(QueueStatus.CANCELLED);
        entry.setUpdatedAt(LocalDateTime.now());

        Appointment appointment = entry.getAppointment();

        if (appointment != null) {
            appointment.setStatus(
                    AppointmentStatus.CANCELLED
            );
        }

        return queueEntryRepository.save(entry);
    }

    @Transactional(readOnly = true)
    public QueueEntry findQueueEntry(UUID queueEntryId) {
        return queueEntryRepository
                .findById(queueEntryId)
                .orElseThrow(
                        () -> new ResourceNotFoundException(
                                "Queue entry not found"
                        )
                );
    }

    private DoctorQueueResponse mapToDoctorQueueResponse(
            QueueEntry entry,
            int queuePosition,
            int estimatedWaitMinutes
    ) {
        String status =
                entry.getStatus() != null
                        ? entry.getStatus().name()
                        : QueueStatus.WAITING.name();

        return DoctorQueueResponse.builder()
                .id(entry.getId())
                .patientId(entry.getPatientId())
                .patientName(entry.getPatientName())
                .patientNumber(entry.getPatientNumber())
                .age(entry.getAge())
                .gender(entry.getGender())
                .chiefComplaint(entry.getChiefComplaint())
                .severityScore(entry.getSeverityScore())
                .severityLabel(entry.getSeverityLabel())
                .scheduledTime(entry.getScheduledTime())
                .queuePosition(queuePosition)
                .estimatedWaitMinutes(
                        estimatedWaitMinutes
                )
                .status(status)
                .isEmergency(entry.isEmergency())
                .premium(entry.isPremium())
                .build();
    }

    private QueueEntryResponse mapToResponse(
            QueueEntry queueEntry
    ) {
        return QueueEntryResponse.builder()
                .id(queueEntry.getId())
                .patientId(queueEntry.getPatientId())
                .departmentId(
                        queueEntry.getDepartmentId()
                )
                .patientName(queueEntry.getPatientName())
                .patientNumber(
                        queueEntry.getPatientNumber()
                )
                .age(queueEntry.getAge())
                .gender(queueEntry.getGender())
                .chiefComplaint(
                        queueEntry.getChiefComplaint()
                )
                .severityScore(
                        queueEntry.getSeverityScore()
                )
                .severityLabel(
                        queueEntry.getSeverityLabel()
                )
                .scheduledTime(
                        queueEntry.getScheduledTime()
                )
                .currentPosition(
                        queueEntry.getCurrentPosition()
                )
                .estimatedCallTime(
                        queueEntry.getEstimatedCallTime()
                )
                .premium(queueEntry.isPremium())
                .emergency(queueEntry.isEmergency())
                .status(
                        queueEntry.getStatus() != null
                                ? queueEntry
                                    .getStatus()
                                    .name()
                                : null
                )
                .build();
    }

    private void ensurePatientIsWaiting(
            QueueEntry entry
    ) {
        if (entry.getStatus() != QueueStatus.WAITING) {
            throw new IllegalStateException(
                    "Only a waiting patient can be called."
            );
        }
    }

    private void validateSeverityScore(Integer score) {
        if (score == null || score < 0 || score > 10) {
            throw new IllegalArgumentException(
                    "Severity score must be between 0 and 10."
            );
        }
    }

    private String calculateSeverityLabel(
            Integer score
    ) {
        if (score >= 9) {
            return "CRITICAL";
        }

        if (score >= 7) {
            return "SEVERE";
        }

        if (score >= 4) {
            return "MODERATE";
        }

        return "MILD";
    }

    private int getStatusPriority(
            QueueStatus status
    ) {
        if (status == QueueStatus.IN_CONSULTATION) {
            return 0;
        }

        if (status == QueueStatus.CALLED) {
            return 1;
        }

        return 2;
    }
}