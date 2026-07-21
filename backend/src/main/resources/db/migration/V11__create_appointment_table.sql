CREATE TABLE appointment (
    id UUID PRIMARY KEY,

    patient_id UUID NOT NULL,
    department_id UUID NOT NULL,

    scheduled_time TIMESTAMP NOT NULL,
    queue_position INTEGER NOT NULL DEFAULT 0,
    severity_score INTEGER NOT NULL DEFAULT 0,
    is_emergency BOOLEAN NOT NULL DEFAULT FALSE,

    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_appointment_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id),

    CONSTRAINT fk_appointment_department
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
);