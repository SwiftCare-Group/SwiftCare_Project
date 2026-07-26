package com.swiftcare.backend.notification.device.dto;
import com.swiftcare.backend.notification.device.DevicePlatform;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PushDeviceResponse(
        UUID id,
        UUID patientId,
        String token,
        DevicePlatform platform,
        String deviceName,
        boolean active,
        OffsetDateTime lastRegisteredAt
) {
}