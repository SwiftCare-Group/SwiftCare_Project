package com.swiftcare.backend.subscription.dto;

import com.swiftcare.backend.common.enums.SubscriptionPlan;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SubscriptionUpgradeRequest {

    @NotNull(message = "Plan is required")
    private SubscriptionPlan plan;
}