package com.swiftcare.backend.consultation;

import com.swiftcare.backend.common.enums.ConsultationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConsultationRepository extends JpaRepository<Consultation, UUID> {

    List<Consultation> findAllByPatientIdOrderByScheduledAtDesc(UUID patientId);

    List<Consultation> findAllByDoctorIdOrderByScheduledAtDesc(UUID doctorId);

    boolean existsByQueueEntryId(UUID queueEntryId);

    Optional<Consultation> findByQueueEntryId(UUID queueEntryId);
    @Query("""
        SELECT COUNT(consultation)
        FROM Consultation consultation
        WHERE consultation.doctor.id = :doctorId
          AND consultation.status IN :statuses
          AND consultation.scheduledAt > :windowStart
          AND consultation.scheduledAt < :windowEnd
        """)
    long countDoctorConflicts(
            @Param("doctorId") UUID doctorId,
            @Param("statuses") List<ConsultationStatus> statuses,
            @Param("windowStart") LocalDateTime windowStart,
            @Param("windowEnd") LocalDateTime windowEnd
    );

    @Query("""
        SELECT COUNT(consultation)
        FROM Consultation consultation
        WHERE consultation.patient.id = :patientId
          AND consultation.status IN :statuses
          AND consultation.scheduledAt > :windowStart
          AND consultation.scheduledAt < :windowEnd
        """)
    long countPatientConflicts(
            @Param("patientId") UUID patientId,
            @Param("statuses") List<ConsultationStatus> statuses,
            @Param("windowStart") LocalDateTime windowStart,
            @Param("windowEnd") LocalDateTime windowEnd
    );

}
