DROP TABLE IF EXISTS queue_entries;

CREATE TABLE queue_entries (
    id UUID PRIMARY KEY,

    appointment_id UUID NOT NULL UNIQUE,
    department_id UUID NOT NULL,

    current_position INTEGER NOT NULL DEFAULT 0,
    estimated_call_time TIMESTAMP,

    severity_score INTEGER NOT NULL DEFAULT 0,
    premium BOOLEAN NOT NULL DEFAULT FALSE,
    emergency BOOLEAN NOT NULL DEFAULT FALSE,

    status VARCHAR(50) NOT NULL DEFAULT 'WAITING',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_queue_appointment
        FOREIGN KEY (appointment_id)
        REFERENCES appointment(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_queue_department
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
);