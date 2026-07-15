package com.swiftcare.backend.symptom;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SymptomSubmissionRepository extends JpaRepository<SymptomSubmission, UUID> {
    List<SymptomSubmission> findByPatientIdOrderByCreatedAtDesc(UUID patientId);
}