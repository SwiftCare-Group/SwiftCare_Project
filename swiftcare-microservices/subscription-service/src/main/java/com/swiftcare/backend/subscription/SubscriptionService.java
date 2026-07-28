package com.swiftcare.backend.subscription;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.swiftcare.backend.common.enums.SubscriptionPlan;
import com.swiftcare.backend.common.enums.SubscriptionStatus;
import com.swiftcare.backend.common.enums.Tier;
import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.patient.Patient;
import com.swiftcare.backend.patient.PatientRepository;
import com.swiftcare.backend.subscription.dto.PaymentInitializationResponse;
import com.swiftcare.backend.subscription.dto.PaystackInitializeResponse;
import com.swiftcare.backend.subscription.dto.SubscriptionPlanResponse;
import com.swiftcare.backend.subscription.dto.SubscriptionResponse;
import com.swiftcare.backend.subscription.dto.SubscriptionUpgradeRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SubscriptionService {

    private final SubscriptionRepository subscriptionRepository;
    private final PatientRepository patientRepository;
    private final ObjectMapper objectMapper;

    @Value("${paystack.secret-key:}")
    private String paystackSecretKey;

    @Value("${paystack.callback-url:swiftcare://subscription/callback}")
    private String paystackCallbackUrl;

    @Value("${paystack.monthly-price-pesewas:10000}")
    private long monthlyPricePesewas;

    @Value("${paystack.yearly-price-pesewas:100000}")
    private long yearlyPricePesewas;

    @Transactional(readOnly = true)
    public List<SubscriptionPlanResponse> getPlans() {
        return List.of(
                toPlanResponse(SubscriptionPlan.MONTHLY, "Monthly Premium"),
                toPlanResponse(SubscriptionPlan.YEARLY, "Yearly Premium")
        );
    }

    @Transactional
    public PaymentInitializationResponse initializePayment(
            UUID patientId,
            SubscriptionUpgradeRequest request
    ) {
        validatePaystackConfiguration();
        if (request == null || request.getPlan() == null) {
            throw new IllegalArgumentException("Subscription plan is required");
        }

        Patient patient = findPatient(patientId);
        Subscription existing = subscriptionRepository.findByPatientId(patientId).orElse(null);

        if (existing != null) {
            expireIfNeeded(existing);
        }

        if (existing != null
                && existing.getStatus() == SubscriptionStatus.ACTIVE
                && existing.getExpiresAt() != null
                && existing.getExpiresAt().isAfter(LocalDateTime.now())) {
            throw new IllegalStateException("Patient already has an active subscription");
        }

        long amount = getConfiguredAmount(request.getPlan());
        String reference = "SWIFT-" + UUID.randomUUID()
                .toString()
                .replace("-", "")
                .substring(0, 16)
                .toUpperCase(Locale.ROOT);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("email", patient.getEmail());
        body.put("amount", amount);
        body.put("reference", reference);
        body.put("currency", "GHS");
        body.put("callback_url", paystackCallbackUrl);
        body.put("metadata", Map.of(
                "plan", request.getPlan().name(),
                "patientId", patientId.toString()
        ));

        PaystackInitializeResponse providerResponse = initializePaystackTransaction(body);
        String providerReference = providerResponse.getData().getReference();
        if (providerReference != null
                && !providerReference.isBlank()
                && !reference.equals(providerReference)) {
            throw new SecurityException("Payment provider returned a mismatched reference");
        }

        Subscription subscription = existing == null ? new Subscription() : existing;
        LocalDateTime now = LocalDateTime.now();
        subscription.setPatient(patient);
        subscription.setPlan(request.getPlan());
        subscription.setStatus(SubscriptionStatus.PENDING);
        subscription.setPaystackReference(reference);
        subscription.setStartedAt(now);
        subscription.setExpiresAt(now);
        subscription.setCancelledAt(null);
        subscriptionRepository.save(subscription);

        return PaymentInitializationResponse.builder()
                .paymentUrl(providerResponse.getData().getAuthorization_url())
                .reference(reference)
                .build();
    }

    @Transactional
    public SubscriptionResponse verifyPayment(UUID patientId, String reference) {
        validatePaystackConfiguration();
        if (reference == null || reference.isBlank()) {
            throw new IllegalArgumentException("Payment reference is required");
        }

        Subscription subscription = subscriptionRepository
                .findForUpdateByPaystackReference(reference.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Subscription payment not found"));

        if (!subscription.getPatient().getId().equals(patientId)) {
            throw new SecurityException("This payment does not belong to the authenticated patient");
        }

        if (subscription.getStatus() == SubscriptionStatus.ACTIVE
                && subscription.getExpiresAt() != null
                && subscription.getExpiresAt().isAfter(LocalDateTime.now())) {
            return mapToResponse(subscription);
        }

        if (subscription.getStatus() != SubscriptionStatus.PENDING) {
            throw new IllegalStateException(
                    "This payment reference has already been completed or is no longer valid"
            );
        }

        Map<String, Object> data = verifyPaystackTransaction(reference.trim());
        validateSuccessfulCharge(data, subscription);
        return mapToResponse(activateSubscription(subscription));
    }

    @Transactional
    public void handleWebhook(String rawPayload, String suppliedSignature) {
        validatePaystackConfiguration();
        if (!isValidWebhookSignature(rawPayload, suppliedSignature)) {
            throw new SecurityException("Invalid Paystack webhook signature");
        }

        Map<String, Object> payload;
        try {
            payload = objectMapper.readValue(rawPayload, new TypeReference<>() {});
        } catch (Exception exception) {
            throw new IllegalArgumentException("Paystack webhook payload is invalid");
        }

        if (!"charge.success".equals(payload.get("event"))) {
            return;
        }

        Map<String, Object> data = requireDataMap(payload.get("data"));
        String reference = requireString(data.get("reference"), "Paystack transaction reference is missing");
        Subscription subscription = subscriptionRepository
                .findForUpdateByPaystackReference(reference)
                .orElse(null);

        // A delayed webhook can arrive after a newer checkout replaced the
        // patient's pending reference. It is safe to acknowledge and ignore it.
        if (subscription == null
                || subscription.getStatus() != SubscriptionStatus.PENDING) {
            return;
        }

        validateSuccessfulCharge(data, subscription);
        activateSubscription(subscription);
    }

    @Transactional
    public SubscriptionResponse getStatus(UUID patientId) {
        Subscription subscription = subscriptionRepository
                .findByPatientId(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("No subscription found"));
        expireIfNeeded(subscription);
        return mapToResponse(subscription);
    }

    @Transactional
    public SubscriptionResponse cancel(UUID patientId) {
        Subscription subscription = subscriptionRepository
                .findByPatientId(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("No subscription found"));

        if (subscription.getStatus() != SubscriptionStatus.CANCELLED) {
            subscription.setStatus(SubscriptionStatus.CANCELLED);
            subscription.setCancelledAt(LocalDateTime.now());
            subscriptionRepository.save(subscription);
        }

        Patient patient = subscription.getPatient();
        patient.setTier(Tier.FREE);
        patientRepository.save(patient);
        return mapToResponse(subscription);
    }

    @Transactional
    public void processExpiredSubscriptions() {
        List<Subscription> expired = subscriptionRepository
                .findAllByStatusAndExpiresAtBefore(
                        SubscriptionStatus.ACTIVE,
                        LocalDateTime.now()
                );

        for (Subscription subscription : expired) {
            subscription.setStatus(SubscriptionStatus.EXPIRED);
            subscriptionRepository.save(subscription);
            Patient patient = subscription.getPatient();
            patient.setTier(Tier.FREE);
            patientRepository.save(patient);
        }
    }

    private void expireIfNeeded(Subscription subscription) {
        if (subscription.getStatus() != SubscriptionStatus.ACTIVE
                || subscription.getExpiresAt() == null
                || subscription.getExpiresAt().isAfter(LocalDateTime.now())) {
            return;
        }

        subscription.setStatus(SubscriptionStatus.EXPIRED);
        subscriptionRepository.save(subscription);

        Patient patient = subscription.getPatient();
        if (patient != null && patient.getTier() != Tier.FREE) {
            patient.setTier(Tier.FREE);
            patientRepository.save(patient);
        }
    }

    private Subscription activateSubscription(Subscription subscription) {
        if (subscription.getStatus() == SubscriptionStatus.ACTIVE
                && subscription.getExpiresAt() != null
                && subscription.getExpiresAt().isAfter(LocalDateTime.now())) {
            return subscription;
        }

        LocalDateTime start = LocalDateTime.now();
        subscription.setStatus(SubscriptionStatus.ACTIVE);
        subscription.setStartedAt(start);
        subscription.setExpiresAt(
                subscription.getPlan() == SubscriptionPlan.MONTHLY
                        ? start.plusMonths(1)
                        : start.plusYears(1)
        );
        subscription.setCancelledAt(null);
        Subscription saved = subscriptionRepository.save(subscription);

        Patient patient = subscription.getPatient();
        patient.setTier(Tier.PREMIUM);
        patientRepository.save(patient);
        return saved;
    }

    private Patient findPatient(UUID patientId) {
        if (patientId == null) {
            throw new IllegalArgumentException("Patient ID is required");
        }
        return patientRepository.findById(patientId)
                .filter(current -> !current.isDeleted())
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));
    }

    private Map<String, Object> verifyPaystackTransaction(String reference) {
        try {
            HttpResponse<String> response = paystackClient().send(
                    HttpRequest.newBuilder()
                            .uri(URI.create("https://api.paystack.co/transaction/verify/" + reference))
                            .timeout(Duration.ofSeconds(20))
                            .header("Authorization", "Bearer " + paystackSecretKey)
                            .GET()
                            .build(),
                    HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalStateException("Payment could not be verified");
            }

            Map<String, Object> providerResponse = objectMapper.readValue(
                    response.body(),
                    new TypeReference<>() {}
            );
            if (!Boolean.TRUE.equals(providerResponse.get("status"))) {
                throw new IllegalStateException("Payment provider did not verify this transaction");
            }

            Map<String, Object> data = requireDataMap(providerResponse.get("data"));
            String returnedReference = requireString(
                    data.get("reference"),
                    "Verified payment reference is missing"
            );
            if (!reference.equals(returnedReference)) {
                throw new SecurityException("Verified payment reference does not match");
            }
            return data;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Payment verification was interrupted");
        } catch (SecurityException | IllegalStateException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to verify payment at this time");
        }
    }

    private void validateSuccessfulCharge(Map<?, ?> data, Subscription subscription) {
        String status = requireString(data.get("status"), "Payment status is missing");
        if (!"success".equalsIgnoreCase(status)) {
            throw new IllegalStateException("Payment has not completed successfully");
        }

        String currency = requireString(data.get("currency"), "Payment currency is missing");
        if (!"GHS".equalsIgnoreCase(currency)) {
            throw new SecurityException("Payment currency does not match the subscription");
        }

        long paidAmount = parseAmount(data.get("amount"));
        long expectedAmount = getConfiguredAmount(subscription.getPlan());
        if (paidAmount != expectedAmount) {
            throw new SecurityException("Payment amount does not match the subscription plan");
        }

        Map<String, Object> customer = requireDataMap(data.get("customer"));
        String paidEmail = requireString(customer.get("email"), "Payment customer email is missing");
        String patientEmail = subscription.getPatient().getEmail();
        if (patientEmail == null || !patientEmail.equalsIgnoreCase(paidEmail.trim())) {
            throw new SecurityException("Payment customer does not match the patient account");
        }
    }

    private long parseAmount(Object amountValue) {
        if (amountValue instanceof Number amount) {
            return amount.longValue();
        }
        if (amountValue instanceof String amount) {
            try {
                return Long.parseLong(amount);
            } catch (NumberFormatException exception) {
                throw new SecurityException("Payment amount is invalid");
            }
        }
        throw new SecurityException("Payment amount is missing");
    }

    private long getConfiguredAmount(SubscriptionPlan plan) {
        if (plan == null) {
            throw new IllegalArgumentException("Subscription plan is required");
        }
        long amount = plan == SubscriptionPlan.MONTHLY
                ? monthlyPricePesewas
                : yearlyPricePesewas;
        if (amount <= 0) {
            throw new IllegalStateException("Subscription price is not configured correctly");
        }
        return amount;
    }

    private SubscriptionPlanResponse toPlanResponse(SubscriptionPlan plan, String displayName) {
        long amount = getConfiguredAmount(plan);
        return SubscriptionPlanResponse.builder()
                .plan(plan)
                .displayName(displayName)
                .currency("GHS")
                .amountMinor(amount)
                .formattedPrice(String.format(Locale.ROOT, "GHS %,.2f", amount / 100.0))
                .build();
    }

    private PaystackInitializeResponse initializePaystackTransaction(Map<String, Object> body) {
        try {
            HttpResponse<String> response = paystackClient().send(
                    HttpRequest.newBuilder()
                            .uri(URI.create("https://api.paystack.co/transaction/initialize"))
                            .timeout(Duration.ofSeconds(20))
                            .header("Authorization", "Bearer " + paystackSecretKey)
                            .header("Content-Type", "application/json")
                            .POST(HttpRequest.BodyPublishers.ofString(
                                    objectMapper.writeValueAsString(body)
                            ))
                            .build(),
                    HttpResponse.BodyHandlers.ofString()
            );

            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalStateException("Payment provider rejected the initialization request");
            }

            PaystackInitializeResponse parsed = objectMapper.readValue(
                    response.body(),
                    PaystackInitializeResponse.class
            );
            if (!parsed.isStatus()
                    || parsed.getData() == null
                    || parsed.getData().getAuthorization_url() == null
                    || parsed.getData().getAuthorization_url().isBlank()) {
                throw new IllegalStateException("Payment provider returned an invalid response");
            }
            validateAuthorizationUrl(parsed.getData().getAuthorization_url());
            return parsed;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Payment initialization was interrupted");
        } catch (IllegalStateException exception) {
            throw exception;
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to initialize payment at this time");
        }
    }


    private void validateAuthorizationUrl(String authorizationUrl) {
        try {
            URI uri = URI.create(authorizationUrl);
            String host = uri.getHost();
            boolean secure = "https".equalsIgnoreCase(uri.getScheme());
            boolean trustedHost = host != null
                    && (host.equalsIgnoreCase("paystack.com")
                    || host.toLowerCase(Locale.ROOT).endsWith(".paystack.com"));

            if (!secure || !trustedHost) {
                throw new SecurityException(
                        "Payment provider returned an untrusted checkout URL"
                );
            }
        } catch (IllegalArgumentException exception) {
            throw new SecurityException(
                    "Payment provider returned an invalid checkout URL"
            );
        }
    }

    private HttpClient paystackClient() {
        return HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    private boolean isValidWebhookSignature(String payload, String suppliedSignature) {
        if (payload == null || suppliedSignature == null || suppliedSignature.isBlank()) {
            return false;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(
                    paystackSecretKey.getBytes(StandardCharsets.UTF_8),
                    "HmacSHA512"
            ));
            String expectedSignature = HexFormat.of().formatHex(
                    mac.doFinal(payload.getBytes(StandardCharsets.UTF_8))
            );
            return MessageDigest.isEqual(
                    expectedSignature.getBytes(StandardCharsets.US_ASCII),
                    suppliedSignature.trim().toLowerCase(Locale.ROOT)
                            .getBytes(StandardCharsets.US_ASCII)
            );
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to verify payment webhook");
        }
    }

    private void validatePaystackConfiguration() {
        if (paystackSecretKey == null
                || paystackSecretKey.isBlank()
                || !paystackSecretKey.startsWith("sk_")) {
            throw new IllegalStateException(
                    "Paystack is not configured. Set PAYSTACK_SECRET_KEY before starting subscription-service"
            );
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> requireDataMap(Object value) {
        if (!(value instanceof Map<?, ?> map)) {
            throw new IllegalArgumentException("Payment provider data is missing");
        }
        return (Map<String, Object>) map;
    }

    private String requireString(Object value, String message) {
        if (!(value instanceof String text) || text.isBlank()) {
            throw new IllegalArgumentException(message);
        }
        return text.trim();
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
