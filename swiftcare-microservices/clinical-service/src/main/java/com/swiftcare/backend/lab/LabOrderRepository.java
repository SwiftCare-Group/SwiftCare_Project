package com.swiftcare.backend.lab;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LabOrderRepository
        extends JpaRepository<LabOrder, UUID> {

    List<LabOrder> findAllByPatientIdOrderByOrderedAtDesc(
            UUID patientId
    );

    List<LabOrder>
    findAllByConsultationDoctorEmailOrderByOrderedAtDesc(
            String doctorEmail
    );

    List<LabOrder> findAllByStatusInOrderByOrderedAtAsc(
            List<LabStatus> statuses
    );

    boolean existsByConsultationIdAndTestNameIgnoreCase(
            UUID consultationId,
            String testName
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT order FROM LabOrder order WHERE order.id = :id")
    Optional<LabOrder> findForUpdateById(@Param("id") UUID id);
}