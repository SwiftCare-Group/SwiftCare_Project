package com.swiftcare.backend.appointment;

import com.swiftcare.backend.common.enums.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface AppointmentRepository
        extends JpaRepository<Appointment, UUID> {

    List<Appointment>
    findAllByPatientIdOrderByCreatedAtDesc(
            UUID patientId
    );

    List<Appointment>
    findAllByDepartmentIdAndStatusOrderBySeverityScoreDescScheduledTimeAsc(
            UUID departmentId,
            AppointmentStatus status
    );

    long countByStatus(AppointmentStatus status);

    long countByDepartmentIdAndScheduledTimeBetweenAndStatusIn(
            UUID departmentId,
            LocalDateTime start,
            LocalDateTime end,
            List<AppointmentStatus> statuses
    );

    List<Appointment> findAllByDepartmentIdAndScheduledTimeBetweenAndStatusIn(
            UUID departmentId,
            LocalDateTime start,
            LocalDateTime end,
            List<AppointmentStatus> statuses
    );

    boolean existsByDepartmentIdAndScheduledTimeAndStatusIn(
            UUID departmentId,
            LocalDateTime scheduledTime,
            List<AppointmentStatus> statuses
    );

    @Query("""
        SELECT COALESCE(MAX(a.queuePosition), 0)
        FROM Appointment a
        WHERE a.department.id = :departmentId
          AND a.status = 'PENDING'
        """)
    int findMaxQueuePositionByDepartmentId(
            UUID departmentId
    );
}