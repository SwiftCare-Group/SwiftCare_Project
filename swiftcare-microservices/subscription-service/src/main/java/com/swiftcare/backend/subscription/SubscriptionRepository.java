package com.swiftcare.backend.subscription;

import com.swiftcare.backend.common.enums.SubscriptionStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT subscription FROM Subscription subscription " +
            "JOIN FETCH subscription.patient " +
            "WHERE subscription.paystackReference = :reference")
    Optional<Subscription> findForUpdateByPaystackReference(
            @Param("reference") String reference
    );
}