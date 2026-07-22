package com.swiftcare.backend.queue;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import com.swiftcare.backend.common.enums.QueueStatus;

@Repository
public interface QueueEntryRepository
        extends JpaRepository<QueueEntry, UUID> {

    /*
     * Required by AppointmentService.
     *
     * Spring Data understands AppointmentId as appointment.id.
     */
    Optional<QueueEntry> findByAppointmentId(UUID appointmentId);

List<QueueEntry>
findByDepartmentIdAndStatusOrderBySeverityScoreDescPremiumDescScheduledTimeAsc(
        UUID departmentId,
        QueueStatus status
);

    List<QueueEntry>
    findByDepartmentIdOrderBySeverityScoreDescPremiumDescScheduledTimeAsc(
            UUID departmentId
    );

  List<QueueEntry> findByStatusOrderByCurrentPositionAsc(
        QueueStatus status
);
List<QueueEntry>
findByDepartmentIdAndStatusInOrderBySeverityScoreDescPremiumDescScheduledTimeAsc(
        UUID departmentId,
        List<QueueStatus> statuses
);
}