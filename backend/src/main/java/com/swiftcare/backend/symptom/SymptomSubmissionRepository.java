package com.swiftcare.backend.symptom;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SymptomSubmissionRepository extends JpaRepository<SymptomSubmission, Long> {
    List<SymptomSubmission> findByPatientIdOrderByCreatedAtDesc(java.util.UUID patientId);
}