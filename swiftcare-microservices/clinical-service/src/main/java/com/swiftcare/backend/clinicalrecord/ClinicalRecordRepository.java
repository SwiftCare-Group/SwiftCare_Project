package com.swiftcare.backend.clinicalrecord;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClinicalRecordRepository
        extends JpaRepository<ClinicalRecord, UUID> {

    boolean existsByQueueEntryId(UUID queueEntryId);

    Optional<ClinicalRecord> findByQueueEntryId(UUID queueEntryId);

    List<ClinicalRecord> findAllByPatientIdOrderByCreatedAtDesc(
            UUID patientId
    );

    List<ClinicalRecord> findAllByDoctorIdOrderByCreatedAtDesc(
            UUID doctorId
    );
}