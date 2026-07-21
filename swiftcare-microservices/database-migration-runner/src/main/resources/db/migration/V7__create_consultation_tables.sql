CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    license_no VARCHAR(255) NOT NULL,
    department_id UUID NOT NULL,
    is_available_online BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_doctor_department FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL,
    doctor_id UUID NOT NULL,
    scheduled_at TIMESTAMP NOT NULL,
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    session_url VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    notes TEXT,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_consultation_patient FOREIGN KEY (patient_id) REFERENCES patients(id),
    CONSTRAINT fk_consultation_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL UNIQUE,
    doctor_id UUID NOT NULL,
    patient_id UUID NOT NULL,
    qr_code_data TEXT NOT NULL,
    qr_code_hash VARCHAR(255) NOT NULL,
    issued_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_prescription_consultation FOREIGN KEY (consultation_id) REFERENCES consultations(id),
    CONSTRAINT fk_prescription_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id),
    CONSTRAINT fk_prescription_patient FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE prescription_drugs (
    prescription_id UUID NOT NULL,
    drug VARCHAR(255),
    CONSTRAINT fk_prescription_drugs FOREIGN KEY (prescription_id) REFERENCES prescriptions(id)
);

CREATE TABLE dispensation_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL,
    drug_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    pharmacy_name VARCHAR(255),
    dispensed_at TIMESTAMP,
    CONSTRAINT fk_dispensation_prescription FOREIGN KEY (prescription_id) REFERENCES prescriptions(id)
);

