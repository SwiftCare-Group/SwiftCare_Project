package com.swiftcare.consultation_service.repository;

import com.swiftcare.consultation_service.model.DispensationRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DispensationRecordRepository extends JpaRepository<DispensationRecord, Long> {

    // Find all drug records for a specific prescription
    // e.g. "Show me all drugs on prescription number 7"
    List<DispensationRecord> findByPrescriptionId(Long prescriptionId);

    // Find all records with a specific status
    // e.g. "Show me all drugs that were UNAVAILABLE"
    List<DispensationRecord> findByStatus(String status);
}
