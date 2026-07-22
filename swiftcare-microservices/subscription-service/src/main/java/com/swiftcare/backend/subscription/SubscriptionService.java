package com.swiftcare.backend.subscription;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftcare.backend.common.enums.SubscriptionPlan;
import com.swiftcare.backend.common.enums.SubscriptionStatus;
import com.swiftcare.backend.common.enums.Tier;
import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.patient.Patient;
import com.swiftcare.backend.patient.PatientRepository;
import com.swiftcare.backend.subscription.dto.PaystackInitializeResponse;
import com.swiftcare.backend.subscription.dto.SubscriptionResponse;
import com.swiftcare.backend.subscription.dto.SubscriptionUpgradeRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;
    private final PatientRepository patientRepository;
    private final ObjectMapper objectMapper;

    @Value("${paystack.secret-key}")
    private String paystackSecretKey;

    private static final long MONTHLY_PRICE = 1000000; // 10,000 GHS in pesewas
    private static final long YEARLY_PRICE = 10000000; // 100,000 GHS in pesewas

    public String initializePayment(UUID patientId, SubscriptionUpgradeRequest request) throws Exception {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));

        if (subscriptionRepository.existsByPatientIdAndStatus(patientId, SubscriptionStatus.ACTIVE)) {
            throw new IllegalStateException("Patient already has an active subscription");
        }

        long amount = request.getPlan() == SubscriptionPlan.MONTHLY ? MONTHLY_PRICE : YEARLY_PRICE;
        String reference = "SWIFT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Map<String, Object> body = Map.of(
                "email", patient.getEmail(),
                "amount", amount,
                "reference", reference,
                "currency", "GHS",
                "metadata", Map.of("plan", request.getPlan().name(), "patientId", patientId.toString())
        );

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create("https://api.paystack.co/transaction/initialize"))
                .header("Authorization", "Bearer " + paystackSecretKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                .build();

        HttpResponse<String> httpResponse = client.send(httpRequest, HttpResponse.BodyHandlers.ofString());
        PaystackInitializeResponse paystackResponse = objectMapper.readValue(
                httpResponse.body(), PaystackInitializeResponse.class);

        // Save pending subscription with the reference
        Subscription subscription = Subscription.builder()
                .patient(patient)
                .plan(request.getPlan())
                .status(SubscriptionStatus.ACTIVE)
                .paystackReference(reference)
                .expiresAt(request.getPlan() == SubscriptionPlan.MONTHLY
                        ? LocalDateTime.now().plusMonths(1)
                        : LocalDateTime.now().plusYears(1))
                .build();

        subscriptionRepository.save(subscription);

        return paystackResponse.getData().getAuthorization_url();
    }

    public void handleWebhook(Map<String, Object> payload) {
        String event = (String) payload.get("event");

        if (!"charge.success".equals(event)) return;

        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) payload.get("data");
        String reference = (String) data.get("reference");

        Subscription subscription = subscriptionRepository.findByPaystackReference(reference)
                .orElseThrow(() -> new ResourceNotFoundException("Subscription not found"));

        Patient patient = subscription.getPatient();
        patient.setTier(Tier.PREMIUM);
        patientRepository.save(patient);
    }

    public SubscriptionResponse getStatus(UUID patientId) {
        Subscription subscription = subscriptionRepository.findByPatientId(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("No subscription found"));

        return mapToResponse(subscription);
    }

    public SubscriptionResponse cancel(UUID patientId) {
        Subscription subscription = subscriptionRepository.findByPatientId(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("No subscription found"));

        subscription.setStatus(SubscriptionStatus.CANCELLED);
        subscription.setCancelledAt(LocalDateTime.now());
        subscriptionRepository.save(subscription);

        return mapToResponse(subscription);
    }

    public void processExpiredSubscriptions() {
        List<Subscription> expired = subscriptionRepository
                .findAllByStatusAndExpiresAtBefore(SubscriptionStatus.ACTIVE, LocalDateTime.now());

        for (Subscription subscription : expired) {
            subscription.setStatus(SubscriptionStatus.EXPIRED);
            subscriptionRepository.save(subscription);

            Patient patient = subscription.getPatient();
            patient.setTier(Tier.FREE);
            patientRepository.save(patient);
        }
    }

    private SubscriptionResponse mapToResponse(Subscription subscription) {
        return SubscriptionResponse.builder()
                .id(subscription.getId())
                .patientId(subscription.getPatient().getId())
                .plan(subscription.getPlan())
                .status(subscription.getStatus())
                .startedAt(subscription.getStartedAt())
                .expiresAt(subscription.getExpiresAt())
                .cancelledAt(subscription.getCancelledAt())
                .build();
    }
}