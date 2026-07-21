package com.swiftcare.backend.subscription;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@EnableScheduling
@RequiredArgsConstructor
@Slf4j
public class SubscriptionExpiryJob {

    private final SubscriptionService subscriptionService;

    @Scheduled(cron = "0 0 0 * * *") // runs every day at midnight
    public void processExpiredSubscriptions() {
        log.info("Running subscription expiry job...");
        subscriptionService.processExpiredSubscriptions();
        log.info("Subscription expiry job complete.");
    }
}