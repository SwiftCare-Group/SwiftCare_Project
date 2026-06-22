package com.swiftcare.backend.subscription;

import com.swiftcare.backend.common.enums.SubscriptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, UUID> {
    Optional<Subscription> findByPatientId(UUID patientId);
    boolean existsByPatientIdAndStatus(UUID patientId, SubscriptionStatus status);
    List<Subscription> findAllByStatusAndExpiresAtBefore(SubscriptionStatus status, LocalDateTime dateTime);
    Optional<Subscription> findByPaystackReference(String reference);
}