package com.swiftcare.backend.notification;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class NotificationClient {

    private static final String INTERNAL_SERVICE_KEY_HEADER =
            "X-Internal-Service-Key";

    private final RestClient.Builder restClientBuilder;

    @Value("${services.notification.url}")
    private String notificationServiceUrl;

    @Value("${internal.service-key}")
    private String internalServiceKey;

    public void notifyPatientCalled(
            UUID patientId,
            UUID departmentId,
            Integer queueNumber
    ) {
        if (patientId == null) {
            log.warn(
                    "Patient-called notification skipped because patient ID is missing."
            );
            return;
        }

        PatientCalledRequest request =
                new PatientCalledRequest(
                        patientId,
                        departmentId,
                        queueNumber
                );

        restClientBuilder
                .baseUrl(notificationServiceUrl)
                .build()
                .post()
                .uri(
                        "/api/v1/internal/notifications/patient-called"
                )
                .header(
                        INTERNAL_SERVICE_KEY_HEADER,
                        internalServiceKey
                )
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .toBodilessEntity();
    }

    public record PatientCalledRequest(
            UUID patientId,
            UUID departmentId,
            Integer queueNumber
    ) {
    }
}