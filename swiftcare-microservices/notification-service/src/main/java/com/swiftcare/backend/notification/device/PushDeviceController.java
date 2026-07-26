package com.swiftcare.notification.device;

import com.swiftcare.notification.device.dto.PushDeviceResponse;
import com.swiftcare.notification.device.dto.RegisterPushDeviceRequest;
import com.swiftcare.notification.security.AuthenticatedPatientResolver;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/notifications/devices")
@RequiredArgsConstructor
@PreAuthorize("hasRole('PATIENT')")
public class PushDeviceController {

    private final PushDeviceService pushDeviceService;

    private final AuthenticatedPatientResolver
            authenticatedPatientResolver;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PushDeviceResponse registerDevice(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody
            RegisterPushDeviceRequest request
    ) {
        UUID patientId =
                authenticatedPatientResolver.resolvePatientId(jwt);

        return pushDeviceService.registerDevice(
                patientId,
                request
        );
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivateDevice(
            @AuthenticationPrincipal Jwt jwt,
            @RequestBody DeactivatePushDeviceRequest request
    ) {
        UUID patientId =
                authenticatedPatientResolver.resolvePatientId(jwt);

        pushDeviceService.deactivateDevice(
                patientId,
                request.token()
        );
    }

    @DeleteMapping("/all")
    public Map<String, String> deactivateAllDevices(
            @AuthenticationPrincipal Jwt jwt
    ) {
        UUID patientId =
                authenticatedPatientResolver.resolvePatientId(jwt);

        pushDeviceService.deactivateAllDevices(patientId);

        return Map.of(
                "message",
                "All push devices were deactivated successfully."
        );
    }

    public record DeactivatePushDeviceRequest(
            @NotBlank(message = "Expo push token is required")
            String token
    ) {
    }
}
