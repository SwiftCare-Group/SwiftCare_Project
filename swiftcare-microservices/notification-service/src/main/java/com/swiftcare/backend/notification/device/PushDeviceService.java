package com.swiftcare.notification.device;

import com.swiftcare.notification.device.dto.PushDeviceResponse;
import com.swiftcare.notification.device.dto.RegisterPushDeviceRequest;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PushDeviceService {

    private final PushDeviceRepository pushDeviceRepository;

    @Transactional
    public PushDeviceResponse registerDevice(
            UUID patientId,
            RegisterPushDeviceRequest request
    ) {
        String normalizedToken = request.token().trim();

        PushDevice device = pushDeviceRepository
                .findByExpoPushToken(normalizedToken)
                .orElseGet(PushDevice::new);

        /*
         * A token may have previously belonged to another login on the
         * same physical device. Reassigning it prevents duplicate or
         * incorrect push notifications.
         */
        device.setPatientId(patientId);
        device.setExpoPushToken(normalizedToken);
        device.setPlatform(request.platform());
        device.setDeviceName(normalizeDeviceName(request.deviceName()));
        device.setActive(true);
        device.setLastRegisteredAt(
                OffsetDateTime.now(ZoneOffset.UTC)
        );

        PushDevice savedDevice =
                pushDeviceRepository.save(device);

        return toResponse(savedDevice);
    }

    @Transactional
    public void deactivateDevice(
            UUID patientId,
            String expoPushToken
    ) {
        PushDevice device = pushDeviceRepository
                .findByExpoPushToken(expoPushToken.trim())
                .orElseThrow(() ->
                        new PushDeviceNotFoundException(
                                "Push device was not found."
                        )
                );

        if (!device.getPatientId().equals(patientId)) {
            throw new PushDeviceNotFoundException(
                    "Push device was not found."
            );
        }

        device.setActive(false);
        pushDeviceRepository.save(device);
    }

    @Transactional
    public void deactivateAllDevices(UUID patientId) {
        List<PushDevice> devices =
                pushDeviceRepository
                        .findAllByPatientIdAndActiveTrue(patientId);

        for (PushDevice device : devices) {
            device.setActive(false);
        }

        pushDeviceRepository.saveAll(devices);
    }

    private String normalizeDeviceName(String deviceName) {
        if (deviceName == null || deviceName.isBlank()) {
            return null;
        }

        return deviceName.trim();
    }

    private PushDeviceResponse toResponse(PushDevice device) {
        return new PushDeviceResponse(
                device.getId(),
                device.getPatientId(),
                device.getExpoPushToken(),
                device.getPlatform(),
                device.getDeviceName(),
                device.isActive(),
                device.getLastRegisteredAt()
        );
    }
}