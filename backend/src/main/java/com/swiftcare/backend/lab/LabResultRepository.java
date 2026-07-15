package com.swiftcare.backend.lab;

import com.swiftcare.backend.patient.Patient;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LabResultRepository
        extends JpaRepository<LabResult, UUID> {

    List<LabResult> findByPatientOrderByPerformedAtDesc(
            Patient patient
    );
}