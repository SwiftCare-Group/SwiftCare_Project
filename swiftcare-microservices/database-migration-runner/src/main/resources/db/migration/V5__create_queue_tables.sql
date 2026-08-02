CREATE TABLE hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    contact_info VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    operating_hours VARCHAR(255) NOT NULL,
    queue_capacity INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_department_hospital FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
);

CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL,
    department_id UUID NOT NULL,
    scheduled_time TIMESTAMP NOT NULL,
    queue_position INT NOT NULL DEFAULT 0,
    severity_score INT NOT NULL DEFAULT 0,
    is_emergency BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_appointment_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_appointment_department FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE queue_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL UNIQUE,
    joined_at TIMESTAMP NOT NULL,
    estimated_call_time TIMESTAMP,
    current_position INT NOT NULL DEFAULT 0,
    is_emergency BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'WAITING',
    CONSTRAINT fk_queue_appointment FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);

-- Seed data: one hospital and two departments
INSERT INTO hospitals (id, name, location, contact_info, is_active)
VALUES (gen_random_uuid(), 'KNUST Hospital', 'Kumasi, Ghana', '+233-32-206-0001', TRUE);

INSERT INTO departments (id, hospital_id, name, operating_hours, queue_capacity, is_active)
SELECT gen_random_uuid(), id, 'General OPD', '08:00 - 17:00', 100, TRUE FROM hospitals WHERE name = 'KNUST Hospital';

INSERT INTO departments (id, hospital_id, name, operating_hours, queue_capacity, is_active)
SELECT gen_random_uuid(), id, 'Cardiology', '09:00 - 15:00', 50, TRUE FROM hospitals WHERE name = 'KNUST Hospital';