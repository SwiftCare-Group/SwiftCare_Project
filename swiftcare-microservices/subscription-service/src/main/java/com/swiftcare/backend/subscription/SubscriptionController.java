package com.swiftcare.backend.subscription;

import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.patient.PatientRepository;
import com.swiftcare.backend.subscription.dto.PaymentInitializationResponse;
import com.swiftcare.backend.subscription.dto.PaymentVerificationRequest;
import com.swiftcare.backend.subscription.dto.SubscriptionPlanResponse;
import com.swiftcare.backend.subscription.dto.SubscriptionResponse;
import com.swiftcare.backend.subscription.dto.SubscriptionUpgradeRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

@RestController
@RequestMapping("/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;
    private final PatientRepository patientRepository;

    @GetMapping("/plans")
    public List<SubscriptionPlanResponse> getPlans() {
        return subscriptionService.getPlans();
    }

    @PostMapping("/upgrade")
    public PaymentInitializationResponse upgrade(
            Authentication authentication,
            @Valid @RequestBody SubscriptionUpgradeRequest request
    ) {
        return subscriptionService.initializePayment(
                getPatientId(authentication),
                request
        );
    }

    @PostMapping("/verify")
    public SubscriptionResponse verify(
            Authentication authentication,
            @Valid @RequestBody PaymentVerificationRequest request
    ) {
        return subscriptionService.verifyPayment(
                getPatientId(authentication),
                request.getReference()
        );
    }

    @GetMapping("/status")
    public SubscriptionResponse getStatus(Authentication authentication) {
        return subscriptionService.getStatus(getPatientId(authentication));
    }

    @PutMapping("/cancel")
    public SubscriptionResponse cancel(Authentication authentication) {
        return subscriptionService.cancel(getPatientId(authentication));
    }

    @PostMapping("/webhook")
    public ResponseEntity<Void> webhook(
            @RequestBody String rawPayload,
            @RequestHeader("x-paystack-signature") String signature
    ) {
        subscriptionService.handleWebhook(rawPayload, signature);
        return ResponseEntity.ok().build();
    }

    private UUID getPatientId(Authentication authentication) {
        String email = authenticatedEmail(authentication);

        return patientRepository
                .findByEmailIgnoreCaseAndIsDeletedFalse(email)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Authenticated patient account not found"
                ))
                .getId();
    }

    private String authenticatedEmail(Authentication authentication) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication.getName() == null
                || authentication.getName().isBlank()) {
            throw new IllegalStateException(
                    "Authenticated patient email is unavailable"
            );
        }

        return authentication.getName().trim().toLowerCase(Locale.ROOT);
    }
}
