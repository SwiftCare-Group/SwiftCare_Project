package com.swiftcare.backend.notification.device;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PushDeviceRepository extends JpaRepository<PushDevice, UUID> {

    Optional<PushDevice> findByExpoPushToken(String expoPushToken);

    List<PushDevice> findAllByPatientId(UUID patientId);

    List<PushDevice> findAllByPatientIdAndActiveTrue(UUID patientId);
}