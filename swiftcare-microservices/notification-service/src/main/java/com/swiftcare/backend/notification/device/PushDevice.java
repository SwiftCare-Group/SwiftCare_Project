package com.swiftcare.backend.notification.device;
import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Entity
@Table(
        name = "notification_push_devices",
        indexes = {
                @Index(
                        name = "idx_notification_push_devices_patient_id",
                        columnList = "patient_id"
                ),
                @Index(
                        name = "idx_notification_push_devices_patient_active",
                        columnList = "patient_id, active"
                )
        },
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_notification_push_device_token",
                        columnNames = "expo_push_token"
                )
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PushDevice {

    @Id
    private UUID id;

    @Column(name = "patient_id", nullable = false)
    private UUID patientId;

    @Column(
            name = "expo_push_token",
            nullable = false,
            length = 255
    )
    private String expoPushToken;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private DevicePlatform platform;

    @Column(name = "device_name", length = 150)
    private String deviceName;

    @Column(nullable = false)
    private boolean active;

    @Column(
            name = "created_at",
            nullable = false,
            updatable = false
    )
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(
            name = "last_registered_at",
            nullable = false
    )
    private OffsetDateTime lastRegisteredAt;

    @PrePersist
    public void onCreate() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        if (id == null) {
            id = UUID.randomUUID();
        }

        createdAt = now;
        updatedAt = now;
        lastRegisteredAt = now;
        active = true;
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = OffsetDateTime.now(ZoneOffset.UTC);
    }
}