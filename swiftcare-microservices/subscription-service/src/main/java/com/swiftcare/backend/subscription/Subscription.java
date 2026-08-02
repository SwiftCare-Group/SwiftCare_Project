package com.swiftcare.backend.subscription;

import com.swiftcare.backend.common.enums.SubscriptionPlan;
import com.swiftcare.backend.common.enums.SubscriptionStatus;
import com.swiftcare.backend.patient.Patient;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "subscriptions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Subscription {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne
    @JoinColumn(name = "patient_id", nullable = false, unique = true)
    private Patient patient;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubscriptionPlan plan;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubscriptionStatus status;

    @Column(nullable = false)
    private LocalDateTime startedAt;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    private LocalDateTime cancelledAt;

    @Column(nullable = false)
    private String paystackReference;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();

        if (startedAt == null) {
            startedAt = now;
        }

        if (expiresAt == null) {
            expiresAt = now;
        }

        if (status == null) {
            status = SubscriptionStatus.PENDING;
        }
    }
}
