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
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
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
            @AuthenticationPrincipal String email,
            @Valid @RequestBody SubscriptionUpgradeRequest request
    ) {
        return subscriptionService.initializePayment(getPatientId(email), request);
    }

    @PostMapping("/verify")
    public SubscriptionResponse verify(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody PaymentVerificationRequest request
    ) {
        return subscriptionService.verifyPayment(
                getPatientId(email),
                request.getReference()
        );
    }

    @GetMapping("/status")
    public SubscriptionResponse getStatus(@AuthenticationPrincipal String email) {
        return subscriptionService.getStatus(getPatientId(email));
    }

    @PutMapping("/cancel")
    public SubscriptionResponse cancel(@AuthenticationPrincipal String email) {
        return subscriptionService.cancel(getPatientId(email));
    }

    @PostMapping("/webhook")
    public ResponseEntity<Void> webhook(
            @RequestBody String rawPayload,
            @RequestHeader("x-paystack-signature") String signature
    ) {
        subscriptionService.handleWebhook(rawPayload, signature);
        return ResponseEntity.ok().build();
    }

    private UUID getPatientId(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalStateException("Authenticated patient email is unavailable");
        }

        return patientRepository
                .findByEmailIgnoreCaseAndIsDeletedFalse(email.trim())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Authenticated patient account not found"
                ))
                .getId();
    }
}
