package com.swiftcare.backend.healthprofile;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface HealthProfileRepository extends JpaRepository<HealthProfile, UUID> {
    Optional<HealthProfile> findByPatientId(UUID patientId);
    boolean existsByPatientId(UUID patientId);
}