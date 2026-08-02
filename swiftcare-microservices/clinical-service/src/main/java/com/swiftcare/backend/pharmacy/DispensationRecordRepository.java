package com.swiftcare.backend.pharmacy;

import com.swiftcare.backend.common.enums.DispensationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DispensationRecordRepository
        extends JpaRepository<DispensationRecord, UUID> {

    List<DispensationRecord> findAllByPrescriptionId(
            UUID prescriptionId
    );

    List<DispensationRecord> findAllByPrescriptionIdAndStatus(
            UUID prescriptionId,
            DispensationStatus status
    );

    Optional<DispensationRecord>
    findByPrescriptionIdAndDrugNameIgnoreCase(
            UUID prescriptionId,
            String drugName
    );
}