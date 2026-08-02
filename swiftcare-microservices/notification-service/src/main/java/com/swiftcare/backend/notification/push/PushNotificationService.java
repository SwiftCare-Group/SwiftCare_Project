package com.swiftcare.backend.notification.push;
import com.swiftcare.backend.notification.device.PushDevice;
import com.swiftcare.backend.notification.device.PushDeviceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
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
                                        departmentId
                                )
                        )
                        .toList();

        if (messages.isEmpty()) {
            return;
        }

        expoPushClient.sendNotifications(messages);
    }

    private ExpoPushClient.ExpoPushMessage
    createPatientCalledMessage(
            PushDevice device,
            UUID departmentId
    ) {
        Map<String, Object> notificationData =
                Map.of(
                        "type", "PATIENT_CALLED",
                        "screen", "queue",
                        "route", "/(patient)/queue",
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