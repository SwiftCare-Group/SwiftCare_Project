package com.swiftcare.backend.queue;

import com.swiftcare.backend.common.enums.QueueStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface QueueEntryRepository extends JpaRepository<QueueEntry, UUID> {
    Optional<QueueEntry> findByAppointmentId(UUID appointmentId);
    List<QueueEntry> findAllByAppointment_Department_IdAndStatusOrderByCurrentPositionAsc(
            UUID departmentId, QueueStatus status);
}