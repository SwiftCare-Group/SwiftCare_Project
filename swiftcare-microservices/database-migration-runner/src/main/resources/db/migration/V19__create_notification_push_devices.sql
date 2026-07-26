CREATE TABLE notification_push_devices (
    id UUID PRIMARY KEY,

    patient_id UUID NOT NULL,

    expo_push_token VARCHAR(255) NOT NULL,

    platform VARCHAR(20) NOT NULL,

    device_name VARCHAR(150),

    active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    last_registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_notification_push_device_token
        UNIQUE (expo_push_token),

    CONSTRAINT chk_notification_push_device_platform
        CHECK (platform IN ('ANDROID', 'IOS', 'WEB'))
);

CREATE INDEX idx_notification_push_devices_patient_id
    ON notification_push_devices (patient_id);

CREATE INDEX idx_notification_push_devices_patient_active
    ON notification_push_devices (patient_id, active);