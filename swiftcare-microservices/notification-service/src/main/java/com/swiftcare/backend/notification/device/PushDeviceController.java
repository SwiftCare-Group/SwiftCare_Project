package com.swiftcare.backend.notification.device;

import com.swiftcare.backend.notification.device.dto.PushDeviceResponse;
import com.swiftcare.backend.notification.device.dto.RegisterPushDeviceRequest;
import com.swiftcare.backend.notification.security.AuthenticatedPatientResolver;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/notifications/devices")
@RequiredArgsConstructor
public class PushDeviceController {

    private final PushDeviceService pushDeviceService;
    private final AuthenticatedPatientResolver patientResolver;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PushDeviceResponse registerDevice(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody RegisterPushDeviceRequest request
    ) {
        UUID patientId = patientResolver.resolvePatientId(email);

        return pushDeviceService.registerDevice(
                patientId,
                request
        );
    }

    @GetMapping
    public List<PushDeviceResponse> getDevices(
            @AuthenticationPrincipal String email
    ) {
        UUID patientId = patientResolver.resolvePatientId(email);

        return pushDeviceService.getDevices(patientId);
    }

    @DeleteMapping("/{deviceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivateDevice(
            @PathVariable UUID deviceId,
            @AuthenticationPrincipal String email
    ) {
        UUID patientId = patientResolver.resolvePatientId(email);

        pushDeviceService.deactivateDevice(
                patientId,
                deviceId
        );
    }
}