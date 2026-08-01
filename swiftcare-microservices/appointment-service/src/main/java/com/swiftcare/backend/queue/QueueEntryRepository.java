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
    findByDepartmentIdAndStatusInOrderBySeverityScoreDescPremiumDescScheduledTimeAsc(
            UUID departmentId,
            List<QueueStatus> statuses
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT entry
            FROM QueueEntry entry
            WHERE entry.departmentId = :departmentId
              AND entry.status IN :statuses
            ORDER BY
                entry.severityScore DESC,
                entry.premium DESC,
                entry.scheduledTime ASC,
                entry.createdAt ASC
            """)
    List<QueueEntry> findAndLockDepartmentQueue(
            @Param("departmentId") UUID departmentId,
            @Param("statuses") List<QueueStatus> statuses
    );
}