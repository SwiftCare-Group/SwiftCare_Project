package com.swiftcare.backend.subscription;

import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.patient.PatientRepository;
import com.swiftcare.backend.subscription.dto.SubscriptionResponse;
import com.swiftcare.backend.subscription.dto.SubscriptionUpgradeRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;
    private final PatientRepository patientRepository;

    @PostMapping("/upgrade")
    public ResponseEntity<Map<String, String>> upgrade(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody SubscriptionUpgradeRequest request) throws Exception {

        UUID patientId = getPatientId(email);
        String paymentUrl = subscriptionService.initializePayment(patientId, request);
        return ResponseEntity.ok(Map.of("paymentUrl", paymentUrl));
    }

    @GetMapping("/status")
    public ResponseEntity<SubscriptionResponse> getStatus(
            @AuthenticationPrincipal String email) {

        UUID patientId = getPatientId(email);
        return ResponseEntity.ok(subscriptionService.getStatus(patientId));
    }

    @PutMapping("/cancel")
    public ResponseEntity<SubscriptionResponse> cancel(
            @AuthenticationPrincipal String email) {

        UUID patientId = getPatientId(email);
        return ResponseEntity.ok(subscriptionService.cancel(patientId));
    }

    @PostMapping("/webhook")
    public ResponseEntity<Void> webhook(@RequestBody Map<String, Object> payload) {
        subscriptionService.handleWebhook(payload);
        return ResponseEntity.ok().build();
    }

    private UUID getPatientId(String email) {
        return patientRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"))
                .getId();
    }
}