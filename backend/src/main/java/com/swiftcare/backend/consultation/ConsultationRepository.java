package com.swiftcare.backend.consultation;

import com.swiftcare.backend.common.enums.ConsultationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

@Repository
public interface ConsultationRepository extends JpaRepository<Consultation, UUID> {
    List<Consultation> findAllByPatientIdOrderByScheduledAtDesc(UUID patientId);
    List<Consultation> findAllByDoctorIdAndStatus(UUID doctorId, ConsultationStatus status);
    
    @Query("SELECT c FROM Consultation c WHERE c.doctor.id = :doctorId AND c.status IN ('SCHEDULED', 'IN_PROGRESS')")
    List<Consultation> findByDoctorIdAndActiveStatuses(@Param("doctorId") UUID doctorId);
}