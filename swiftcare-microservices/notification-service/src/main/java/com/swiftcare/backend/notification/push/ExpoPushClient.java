package com.swiftcare.backend.notification.push;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class ExpoPushClient {

    private final RestClient.Builder restClientBuilder;

    @Value("${expo.push.url}")
    private String expoPushUrl;

    @Value("${expo.push.enabled:true}")
    private boolean expoPushEnabled;

    @Value("${expo.push.access-token:}")
    private String expoAccessToken;

    public void sendNotifications(
            List<ExpoPushMessage> messages
    ) {
        if (!expoPushEnabled) {
            log.info(
                    "Expo push notifications are disabled. {} message(s) skipped.",
                    messages.size()
            );
            return;
        }

        if (messages == null || messages.isEmpty()) {
            log.debug("No Expo push messages to send.");
            return;
        }

        /*
         * Expo supports batches. Keeping batches at 100 prevents
         * oversized push requests when a patient has many devices.
         */
        int batchSize = 100;

        for (int start = 0;
             start < messages.size();
             start += batchSize) {

            int end = Math.min(
                    start + batchSize,
                    messages.size()
            );

            List<ExpoPushMessage> batch =
                    messages.subList(start, end);

            sendBatch(batch);
        }
    }

    private void sendBatch(
            List<ExpoPushMessage> messages
    ) {
        RestClient restClient =
                restClientBuilder.build();

        try {
            String response = restClient
                    .post()
                    .uri(expoPushUrl)
                    .headers(headers -> {
                        headers.setContentType(
                                MediaType.APPLICATION_JSON
                        );

                        headers.setAccept(
                                List.of(MediaType.APPLICATION_JSON)
                        );

                        if (
                                expoAccessToken != null &&
                                !expoAccessToken.isBlank()
                        ) {
                            headers.set(
                                    HttpHeaders.AUTHORIZATION,
                                    "Bearer " + expoAccessToken.trim()
                            );
                        }
                    })
                    .body(messages)
                    .retrieve()
                    .body(String.class);

            log.info(
                    "Expo accepted push batch containing {} notification(s). Response: {}",
                    messages.size(),
                    response
            );

        } catch (Exception exception) {
            log.error(
                    "Failed to send Expo push batch containing {} notification(s).",
                    messages.size(),
                    exception
            );

            throw new PushDeliveryException(
                    "Expo push notification request failed.",
                    exception
            );
        }
    }

    public record ExpoPushMessage(
            String to,
            String sound,
            String title,
            String body,
            String priority,
            Map<String, Object> data
    ) {
    }
}