package com.swiftcare.backend.lab;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
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

    List<LabOrder> findAllByStatusOrderByOrderedAtAsc(
            LabStatus status
    );

    boolean existsByConsultationIdAndTestNameIgnoreCase(
            UUID consultationId,
            String testName
    );
}