package com.swiftcare.consultation_service.repository;

import com.swiftcare.consultation_service.model.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {

    // Find all prescriptions for a specific patient
    List<Prescription> findByPatientId(Long patientId);

    // Find all prescriptions from a specific consultation
    List<Prescription> findByConsultationId(Long consultationId);
}