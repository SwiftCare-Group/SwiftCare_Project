package com.swiftcare.backend.notification.push;
import com.swiftcare.backend.notification.device.PushDevice;
import com.swiftcare.backend.notification.device.PushDeviceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PushNotificationService {

    private final PushDeviceRepository pushDeviceRepository;
    private final ExpoPushClient expoPushClient;

    public void notifyPatientCalled(
            UUID patientId,
            UUID departmentId
    ) {
        if (patientId == null) {
            throw new IllegalArgumentException(
                    "Patient ID is required."
            );
        }

        List<PushDevice> activeDevices =
                pushDeviceRepository
                        .findAllByPatientIdAndActiveTrue(
                                patientId
                        );

        if (activeDevices.isEmpty()) {
            log.info(
                    "No active push devices found for patient {}. Notification skipped.",
                    patientId
            );

            return;
        }

        List<ExpoPushClient.ExpoPushMessage> messages =
                activeDevices.stream()
                        .filter(device ->
                                isValidExpoPushToken(
                                        device.getExpoPushToken()
                                )
                        )
                        .map(device ->
                                createPatientCalledMessage(
                                        device,
                                        patientId,
                                        departmentId
                                )
                        )
                        .toList();

        if (messages.isEmpty()) {
            log.warn(
                    "Patient {} has device records, but none contains a valid Expo push token.",
                    patientId
            );

            return;
        }

        expoPushClient.sendNotifications(messages);

        log.info(
                "Patient-called notification sent to {} device(s) for patient {}.",
                messages.size(),
                patientId
        );
    }

    private ExpoPushClient.ExpoPushMessage
    createPatientCalledMessage(
            PushDevice device,
            UUID patientId,
            UUID departmentId
    ) {
        Map<String, Object> notificationData =
                Map.of(
                        "type", "PATIENT_CALLED",
                        "screen", "queue",
                        "route", "/(patient)/queue",
                        "patientId", patientId.toString(),
                        "departmentId",
                        departmentId != null
                                ? departmentId.toString()
                                : ""
                );

        return new ExpoPushClient.ExpoPushMessage(
                device.getExpoPushToken(),
                "default",
                "SwiftCare",
                "It is your turn. Please proceed to the consultation area.",
                "high",
                notificationData
        );
    }

    private boolean isValidExpoPushToken(
            String token
    ) {
        if (token == null || token.isBlank()) {
            return false;
        }

        String normalizedToken = token.trim();

        return normalizedToken.startsWith(
                "ExponentPushToken["
        ) || normalizedToken.startsWith(
                "ExpoPushToken["
        );
    }
}