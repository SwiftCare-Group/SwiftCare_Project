package com.swiftcare.backend.consultation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ConsultationRepository
        extends JpaRepository<Consultation, UUID> {

    List<Consultation>
    findAllByPatientIdOrderByScheduledAtDesc(UUID patientId);

    List<Consultation>
    findAllByDoctorIdOrderByScheduledAtDesc(UUID doctorId);

    boolean existsByQueueEntryId(UUID queueEntryId);
}