package com.swiftcare.backend.patient;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PatientRepository extends JpaRepository<Patient, UUID> {
    Optional<Patient> findByEmail(String email);
    Optional<Patient> findByEmailIgnoreCaseAndIsDeletedFalse(String email);
    boolean existsByEmail(String email);
    boolean existsByEmailIgnoreCase(String email);

    @Query(value = """
            SELECT EXISTS (
                SELECT 1
                FROM subscriptions
                WHERE patient_id = :patientId
                  AND status = 'ACTIVE'
                  AND expires_at > CURRENT_TIMESTAMP
            )
            """, nativeQuery = true)
    boolean hasActivePremiumSubscription(@Param("patientId") UUID patientId);
}
