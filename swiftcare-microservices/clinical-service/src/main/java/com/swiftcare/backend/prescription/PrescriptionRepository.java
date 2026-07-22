package com.swiftcare.backend.prescription;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PrescriptionRepository
        extends JpaRepository<Prescription, UUID> {

    Optional<Prescription> findByConsultationId(UUID consultationId);

    boolean existsByConsultationId(UUID consultationId);

    Optional<Prescription> findByQrCodeHash(String qrCodeHash);

    List<Prescription> findAllByPatientId(UUID patientId);
}