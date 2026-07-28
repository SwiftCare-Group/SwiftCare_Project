package com.swiftcare.backend.queue;

import com.swiftcare.backend.appointment.Appointment;
import com.swiftcare.backend.common.enums.AppointmentStatus;
import com.swiftcare.backend.common.enums.QueueStatus;
import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.queue.dto.QueueEntryResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import com.swiftcare.backend.notification.NotificationClient;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class QueueService {
    
    private static final int DEFAULT_CONSULTATION_MINUTES = 15;

    private static final List<QueueStatus> ACTIVE_QUEUE_STATUSES =
            List.of(
                    QueueStatus.WAITING,
                    QueueStatus.CALLED,
                    QueueStatus.IN_CONSULTATION
            );

    private static final List<QueueStatus> BUSY_STATUSES =
            List.of(
                    QueueStatus.CALLED,
                    QueueStatus.IN_CONSULTATION
            );

    private final QueueEntryRepository queueEntryRepository;
      private final NotificationClient notificationClient;  

    /*
     * Returns the doctor's live queue.
     */
    @Transactional(readOnly = true)
    public List<DoctorQueueResponse> getDepartmentQueue(
            UUID departmentId
    ) {
        validateDepartmentId(departmentId);

        List<QueueEntry> entries =
                queueEntryRepository
                        .findByDepartmentIdAndStatusInOrderBySeverityScoreDescPremiumDescScheduledTimeAsc(
                                departmentId,
                                ACTIVE_QUEUE_STATUSES
                        );

        List<QueueEntry> activeEntries =
                entries.stream()
                        .filter(this::isBusy)
                        .sorted(
                                Comparator.comparingInt(
                                        entry ->
                                                getStatusPriority(
                                                        entry.getStatus()
                                                )
                                )
                        )
                        .toList();

        List<QueueEntry> waitingEntries =
                entries.stream()
                        .filter(
                                entry ->
                                        entry.getStatus()
                                                == QueueStatus.WAITING
                        )
                        .sorted(waitingQueueComparator())
                        .toList();

        List<DoctorQueueResponse> responses =
                new ArrayList<>();

        /*
         * Show IN_CONSULTATION and CALLED patients first.
         */
        for (QueueEntry entry : activeEntries) {
            responses.add(
                    mapToDoctorQueueResponse(
                            entry,
                            0,
                            0
                    )
            );
        }

        int activePatientCount =
                activeEntries.isEmpty() ? 0 : 1;

        for (int index = 0;
             index < waitingEntries.size();
             index++) {

            QueueEntry entry = waitingEntries.get(index);

            int position = index + 1;

            int estimatedWaitMinutes =
                    (
                            index +
                            activePatientCount
                    ) * DEFAULT_CONSULTATION_MINUTES;

            responses.add(
                    mapToDoctorQueueResponse(
                            entry,
                            position,
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
        return mapToResponse(
                findQueueEntry(queueEntryId)
        );
    }

    /*
     * Creates a new waiting queue entry and recalculates
     * everyone in the department.
     */
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
        validateDepartmentId(departmentId);

        if (appointment == null) {
            throw new IllegalArgumentException(
                    "Appointment is required when creating a queue entry."
            );
        }

        if (scheduledTime == null) {
            throw new IllegalArgumentException(
                    "Scheduled time is required."
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
                .estimatedCallTime(null)
                .premium(Boolean.TRUE.equals(premium))
                .emergency(severityScore >= 4)
                .status(QueueStatus.WAITING)
                .skipCount(0)
                .lastSkippedAt(null)
                .createdAt(now)
                .updatedAt(now)
                .build();

        QueueEntry savedEntry =
                queueEntryRepository.save(entry);

        recalculateDepartmentQueue(departmentId);

        return savedEntry;
    }

    /*
     * Calls a waiting patient.
     *
     * Only one patient may be CALLED or IN_CONSULTATION
     * in a department at a time.
     */
 @Transactional
public QueueEntry callPatient(UUID queueEntryId) {
    QueueEntry selectedEntry =
            findQueueEntry(queueEntryId);

    UUID departmentId =
            selectedEntry.getDepartmentId();

    List<QueueEntry> lockedEntries =
            lockDepartmentQueue(departmentId);

    QueueEntry entry =
            findEntryInsideLockedQueue(
                    lockedEntries,
                    queueEntryId
            );

    ensurePatientIsWaiting(entry);

    boolean anotherPatientIsActive =
            lockedEntries.stream()
                    .anyMatch(
                            current ->
                                    !current.getId()
                                            .equals(entry.getId())
                                    && isBusy(current)
                    );

    if (anotherPatientIsActive) {
        throw new IllegalStateException(
                "Another patient is already called or in consultation in this department."
        );
    }

    entry.setStatus(QueueStatus.CALLED);
    entry.setCurrentPosition(0);
    entry.setEstimatedCallTime(
            LocalDateTime.now()
    );

    entry.clearSkipMarker();

    QueueEntry savedEntry =
            queueEntryRepository.save(entry);

    recalculateLockedQueue(
            departmentId,
            lockedEntries
    );

    try {
        notificationClient.notifyPatientCalled(
                savedEntry.getPatientId(),
                savedEntry.getDepartmentId(),
                savedEntry.getCurrentPosition()
        );
    } catch (Exception exception) {
        /*
         * Do not fail the queue operation simply because the
         * notification service or Expo is temporarily unavailable.
         */
        log.warn(
                "Patient was called, but push notification delivery failed"
        );
    }

    return savedEntry;
}

    /*
     * Starts consultation for the currently called patient.
     */
    @Transactional
    public QueueEntry startConsultation(
            UUID queueEntryId
    ) {
        QueueEntry selectedEntry =
                findQueueEntry(queueEntryId);

        UUID departmentId =
                selectedEntry.getDepartmentId();

        List<QueueEntry> lockedEntries =
                lockDepartmentQueue(departmentId);

        QueueEntry entry =
                findEntryInsideLockedQueue(
                        lockedEntries,
                        queueEntryId
                );

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

        boolean anotherConsultationIsActive =
                lockedEntries.stream()
                        .anyMatch(
                                current ->
                                        !current.getId()
                                                .equals(entry.getId())
                                        && current.getStatus()
                                                == QueueStatus.IN_CONSULTATION
                        );

        if (anotherConsultationIsActive) {
            throw new IllegalStateException(
                    "Another consultation is already in progress in this department."
            );
        }

        entry.setStatus(
                QueueStatus.IN_CONSULTATION
        );

        entry.setCurrentPosition(0);
        entry.setEstimatedCallTime(
                LocalDateTime.now()
        );

        QueueEntry savedEntry =
                queueEntryRepository.save(entry);

        recalculateLockedQueue(
                departmentId,
                lockedEntries
        );

        return savedEntry;
    }

    /*
     * Completes consultation and moves waiting patients up.
     */
    @Transactional
    public QueueEntry completeConsultation(
            UUID queueEntryId
    ) {
        QueueEntry selectedEntry =
                findQueueEntry(queueEntryId);

        UUID departmentId =
                selectedEntry.getDepartmentId();

        List<QueueEntry> lockedEntries =
                lockDepartmentQueue(departmentId);

        QueueEntry entry =
                findEntryInsideLockedQueue(
                        lockedEntries,
                        queueEntryId
                );

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
        entry.setCurrentPosition(0);
        entry.setEstimatedCallTime(null);

        Appointment appointment =
                entry.getAppointment();

        if (appointment != null) {
            appointment.setStatus(
                    AppointmentStatus.COMPLETED
            );
        }

        QueueEntry savedEntry =
                queueEntryRepository.save(entry);

        /*
         * Remove the completed entry from the active list
         * before recalculation.
         */
        lockedEntries.removeIf(
                current ->
                        current.getId()
                                .equals(entry.getId())
        );

        recalculateLockedQueue(
                departmentId,
                lockedEntries
        );

        return savedEntry;
    }

    /*
     * Cancels the selected queue entry and appointment.
     */
    @Transactional
    public QueueEntry cancelQueueEntry(
            UUID queueEntryId
    ) {
        QueueEntry selectedEntry =
                findQueueEntry(queueEntryId);

        UUID departmentId =
                selectedEntry.getDepartmentId();

        List<QueueEntry> lockedEntries =
                lockDepartmentQueue(departmentId);

        QueueEntry entry =
                findEntryInsideLockedQueue(
                        lockedEntries,
                        queueEntryId
                );

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
        entry.setCurrentPosition(0);
        entry.setEstimatedCallTime(null);

        Appointment appointment =
                entry.getAppointment();

        if (appointment != null) {
            appointment.setStatus(
                    AppointmentStatus.CANCELLED
            );
        }

        QueueEntry savedEntry =
                queueEntryRepository.save(entry);

        lockedEntries.removeIf(
                current ->
                        current.getId()
                                .equals(entry.getId())
        );

        recalculateLockedQueue(
                departmentId,
                lockedEntries
        );

        return savedEntry;
    }

    /*
     * Returns a called patient to the end of the waiting queue.
     */
    @Transactional
    public QueueEntry skipPatient(
            UUID queueEntryId
    ) {
        QueueEntry selectedEntry =
                findQueueEntry(queueEntryId);

        UUID departmentId =
                selectedEntry.getDepartmentId();

        List<QueueEntry> lockedEntries =
                lockDepartmentQueue(departmentId);

        QueueEntry entry =
                findEntryInsideLockedQueue(
                        lockedEntries,
                        queueEntryId
                );

        if (entry.getStatus() != QueueStatus.CALLED) {
            throw new IllegalStateException(
                    "Only a called patient can be skipped."
            );
        }

        entry.markAsSkipped();

        QueueEntry savedEntry =
                queueEntryRepository.save(entry);

        recalculateLockedQueue(
                departmentId,
                lockedEntries
        );

        return savedEntry;
    }

    @Transactional(readOnly = true)
    public QueueEntry findQueueEntry(
            UUID queueEntryId
    ) {
        if (queueEntryId == null) {
            throw new IllegalArgumentException(
                    "Queue entry ID is required."
            );
        }

        return queueEntryRepository
                .findById(queueEntryId)
                .orElseThrow(
                        () ->
                                new ResourceNotFoundException(
                                        "Queue entry not found"
                                )
                );
    }

    /*
     * Recalculates positions after creating a new entry.
     */
    private void recalculateDepartmentQueue(
            UUID departmentId
    ) {
        List<QueueEntry> lockedEntries =
                lockDepartmentQueue(departmentId);

        recalculateLockedQueue(
                departmentId,
                lockedEntries
        );
    }

    /*
     * Updates currentPosition and estimatedCallTime
     * for all waiting patients.
     */
    private void recalculateLockedQueue(
            UUID departmentId,
            List<QueueEntry> lockedEntries
    ) {
        List<QueueEntry> waitingEntries =
                lockedEntries.stream()
                        .filter(
                                entry ->
                                        entry.getStatus()
                                                == QueueStatus.WAITING
                        )
                        .sorted(waitingQueueComparator())
                        .toList();

        boolean hasActivePatient =
                lockedEntries.stream()
                        .anyMatch(this::isBusy);

        int activeOffset =
                hasActivePatient ? 1 : 0;

        LocalDateTime calculationTime =
                LocalDateTime.now();

        for (int index = 0;
             index < waitingEntries.size();
             index++) {

            QueueEntry entry =
                    waitingEntries.get(index);

            int position = index + 1;

            int waitMinutes =
                    (
                            index +
                            activeOffset
                    ) * DEFAULT_CONSULTATION_MINUTES;

            entry.setCurrentPosition(position);

            entry.setEstimatedCallTime(
                    calculationTime.plusMinutes(
                            waitMinutes
                    )
            );
        }

        /*
         * Active entries do not have a waiting position.
         */
        lockedEntries.stream()
                .filter(this::isBusy)
                .forEach(
                        entry -> {
                            entry.setCurrentPosition(0);

                            if (entry.getEstimatedCallTime()
                                    == null) {

                                entry.setEstimatedCallTime(
                                        calculationTime
                                );
                            }
                        }
                );

        queueEntryRepository.saveAll(
                lockedEntries
        );
    }

    /*
     * Pessimistically locks the active department queue so
     * two doctors cannot call separate patients simultaneously.
     */
    private List<QueueEntry> lockDepartmentQueue(
            UUID departmentId
    ) {
        validateDepartmentId(departmentId);

        return new ArrayList<>(
                queueEntryRepository
                        .findAndLockDepartmentQueue(
                                departmentId,
                                ACTIVE_QUEUE_STATUSES
                        )
        );
    }

    private QueueEntry findEntryInsideLockedQueue(
            List<QueueEntry> lockedEntries,
            UUID queueEntryId
    ) {
        return lockedEntries.stream()
                .filter(
                        entry ->
                                entry.getId()
                                        .equals(queueEntryId)
                )
                .findFirst()
                .orElseThrow(
                        () ->
                                new IllegalStateException(
                                        "The queue entry is no longer active."
                                )
                );
    }

    /*
     * Waiting queue order:
     *
     * 1. Patients who have not been skipped
     * 2. Severity score
     * 3. Emergency status
     * 4. Premium status
     * 5. Scheduled time
     * 6. Creation time
     * 7. Last skipped time
     */
    private Comparator<QueueEntry>
    waitingQueueComparator() {

        return Comparator
                .comparing(
                        (QueueEntry entry) ->
                                entry.getLastSkippedAt()
                                        != null
                )
                .thenComparing(
                        QueueEntry::getSeverityScore,
                        Comparator.nullsLast(
                                Comparator.reverseOrder()
                        )
                )
                .thenComparing(
                        QueueEntry::isEmergency,
                        Comparator.reverseOrder()
                )
                .thenComparing(
                        QueueEntry::isPremium,
                        Comparator.reverseOrder()
                )
                .thenComparing(
                        QueueEntry::getScheduledTime,
                        Comparator.nullsLast(
                                Comparator.naturalOrder()
                        )
                )
                .thenComparing(
                        QueueEntry::getCreatedAt,
                        Comparator.nullsLast(
                                Comparator.naturalOrder()
                        )
                )
                .thenComparing(
                        QueueEntry::getLastSkippedAt,
                        Comparator.nullsLast(
                                Comparator.naturalOrder()
                        )
                );
    }

    private boolean isBusy(QueueEntry entry) {
        return BUSY_STATUSES.contains(
                entry.getStatus()
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
                .chiefComplaint(
                        entry.getChiefComplaint()
                )
                .severityScore(
                        entry.getSeverityScore()
                )
                .severityLabel(
                        entry.getSeverityLabel()
                )
                .scheduledTime(
                        entry.getScheduledTime()
                )
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
                .patientName(
                        queueEntry.getPatientName()
                )
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
        if (entry.getStatus()
                != QueueStatus.WAITING) {

            throw new IllegalStateException(
                    "Only a waiting patient can be called."
            );
        }
    }

    private void validateDepartmentId(
            UUID departmentId
    ) {
        if (departmentId == null) {
            throw new IllegalArgumentException(
                    "Department ID is required."
            );
        }
    }

    private void validateSeverityScore(
            Integer score
    ) {
        if (score == null ||
                score < 1 ||
                score > 4) {

            throw new IllegalArgumentException(
                    "Severity score must be between 1 and 4."
            );
        }
    }

    private String calculateSeverityLabel(
            Integer score
    ) {
        return switch (score) {
            case 4 -> "EMERGENCY";
            case 3 -> "SEVERE";
            case 2 -> "MODERATE";
            default -> "MILD";
        };
    }

    private int getStatusPriority(
            QueueStatus status
    ) {
        if (status ==
                QueueStatus.IN_CONSULTATION) {
            return 0;
        }

        if (status ==
                QueueStatus.CALLED) {
            return 1;
        }

        return 2;
    }
}