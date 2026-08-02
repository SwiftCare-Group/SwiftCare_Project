CREATE TABLE IF NOT EXISTS queue_entries
(
    id UUID PRIMARY KEY,
    appointment_id UUID,
    patient_id UUID,
    department_id BIGINT,
    patient_name VARCHAR(255),
    patient_number VARCHAR(50),
    age INTEGER,
    gender VARCHAR(30),
    chief_complaint VARCHAR(1000),
    severity_score INTEGER,
    severity_label VARCHAR(30),
    scheduled_time TIMESTAMP,
    current_position INTEGER DEFAULT 0,
    estimated_call_time TIMESTAMP,
    premium BOOLEAN DEFAULT FALSE,
    is_emergency BOOLEAN DEFAULT FALSE,
    status VARCHAR(40) DEFAULT 'WAITING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

ALTER TABLE queue_entries
    ADD COLUMN IF NOT EXISTS appointment_id UUID;

ALTER TABLE queue_entries
    ADD COLUMN IF NOT EXISTS patient_id UUID;

ALTER TABLE queue_entries
    ADD COLUMN IF NOT EXISTS department_id BIGINT;

ALTER TABLE queue_entries
    ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255);

ALTER TABLE queue_entries
    ADD COLUMN IF NOT EXISTS patient_number VARCHAR(50);

ALTER TABLE queue_entries
    ADD COLUMN IF NOT EXISTS age INTEGER;

ALTER TABLE queue_entries
    ADD COLUMN IF NOT EXISTS gender VARCHAR(30);

ALTER TABLE queue_entries
    ADD COLUMN IF NOT EXISTS chief_complaint VARCHAR(1000);

ALTER TABLE queue_entries
    ADD COLUMN IF NOT EXISTS severity_score INTEGER;

ALTER TABLE queue_entries
    ADD COLUMN IF NOT EXISTS severity_label VARCHAR(30);

ALTER TABLE queue_entries
    ADD COLUMN IF NOT EXISTS scheduled_time TIMESTAMP;

ALTER TABLE queue_entries
    ADD COLUMN IF NOT EXISTS current_position INTEGER DEFAULT 0;

ALTER TABLE queue_entries
    ADD COLUMN IF NOT EXISTS estimated_call_time TIMESTAMP;

ALTER TABLE queue_entries
    ADD COLUMN IF NOT EXISTS premium BOOLEAN DEFAULT FALSE;

ALTER TABLE queue_entries
    ADD COLUMN IF NOT EXISTS is_emergency BOOLEAN DEFAULT FALSE;

ALTER TABLE queue_entries
    ADD COLUMN IF NOT EXISTS status VARCHAR(40) DEFAULT 'WAITING';

ALTER TABLE queue_entries
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE queue_entries
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_queue_department
    ON queue_entries (department_id);

CREATE INDEX IF NOT EXISTS idx_queue_status
    ON queue_entries (status);

CREATE INDEX IF NOT EXISTS idx_queue_position
    ON queue_entries (current_position);

CREATE INDEX IF NOT EXISTS idx_queue_order
    ON queue_entries
    (
        department_id,
        status,
        severity_score DESC,
        premium DESC,
        scheduled_time ASC
    );

CREATE UNIQUE INDEX IF NOT EXISTS uq_queue_appointment
    ON queue_entries (appointment_id)
    WHERE appointment_id IS NOT NULL;