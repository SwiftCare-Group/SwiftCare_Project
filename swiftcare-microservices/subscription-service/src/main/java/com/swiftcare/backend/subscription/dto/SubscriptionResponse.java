package com.swiftcare.backend.subscription.dto;

import com.swiftcare.backend.common.enums.SubscriptionPlan;
import com.swiftcare.backend.common.enums.SubscriptionStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionResponse {

    private UUID id;
    private UUID patientId;
    private SubscriptionPlan plan;
    private SubscriptionStatus status;
    private LocalDateTime startedAt;
    private LocalDateTime expiresAt;
    private LocalDateTime cancelledAt;
}