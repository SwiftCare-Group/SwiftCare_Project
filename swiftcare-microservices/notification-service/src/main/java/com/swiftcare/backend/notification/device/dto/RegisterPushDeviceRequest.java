package com.swiftcare.backend.notification.device.dto;
import com.swiftcare.backend.notification.device.DevicePlatform;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RegisterPushDeviceRequest(

        @NotBlank(message = "Expo push token is required")
        @Size(max = 255, message = "Expo push token is too long")
        String token,

        @NotNull(message = "Device platform is required")
        DevicePlatform platform,

        @Size(max = 150, message = "Device name is too long")
        String deviceName
) {
}