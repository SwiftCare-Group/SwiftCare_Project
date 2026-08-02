package com.swiftcare.backend.lab;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface LabResultRepository
        extends JpaRepository<LabResult, UUID> {

    Optional<LabResult> findByLabOrderId(
            UUID labOrderId
    );

    boolean existsByLabOrderId(
            UUID labOrderId
    );
}