package com.swiftcare.backend.queue;

import com.swiftcare.backend.common.enums.QueueStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface QueueEntryRepository
        extends JpaRepository<QueueEntry, UUID> {

    Optional<QueueEntry> findByAppointmentId(
            UUID appointmentId
    );

    List<QueueEntry>
    findByDepartmentIdAndStatusOrderBySeverityScoreDescPremiumDescScheduledTimeAsc(
            UUID departmentId,
            QueueStatus status
    );

    List<QueueEntry>
    findByDepartmentIdOrderBySeverityScoreDescPremiumDescScheduledTimeAsc(
            UUID departmentId
    );

    List<QueueEntry>
    findByStatusOrderByCurrentPositionAsc(
            QueueStatus status
    );

    List<QueueEntry>
    findByDepartmentIdAndStatusInOrderBySeverityScoreDescPremiumDescScheduledTimeAsc(
            UUID departmentId,
            List<QueueStatus> statuses
    );

    boolean existsByDepartmentIdAndStatusIn(
            UUID departmentId,
            List<QueueStatus> statuses
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
   @Query("""
    SELECT q
    FROM QueueEntry q
    WHERE q.departmentId = :departmentId
      AND q.status IN :statuses
    """)
    List<QueueEntry> findAndLockDepartmentQueue(
            @Param("departmentId") UUID departmentId,
            @Param("statuses") List<QueueStatus> statuses
    );
}