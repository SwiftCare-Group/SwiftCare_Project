package com.swiftcare.backend.subscription.dto;

import com.swiftcare.backend.common.enums.SubscriptionPlan;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubscriptionPlanResponse {
    private SubscriptionPlan plan;
    private String displayName;
    private String currency;
    private long amountMinor;
    private String formattedPrice;
}
