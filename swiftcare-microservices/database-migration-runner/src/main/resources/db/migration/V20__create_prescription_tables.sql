CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY,

    consultation_id UUID NOT NULL,
    doctor_id UUID NOT NULL,
    patient_id UUID NOT NULL,

    qr_code_data TEXT NOT NULL,
    qr_code_hash VARCHAR(255) NOT NULL UNIQUE,

    issued_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_prescriptions_consultation
        FOREIGN KEY (consultation_id)
        REFERENCES consultations(id),

    CONSTRAINT fk_prescriptions_doctor
        FOREIGN KEY (doctor_id)
        REFERENCES doctors(id),

    CONSTRAINT fk_prescriptions_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id),

    CONSTRAINT uk_prescriptions_consultation
        UNIQUE (consultation_id)
);

CREATE TABLE IF NOT EXISTS prescription_drugs (
    prescription_id UUID NOT NULL,
    drug VARCHAR(255) NOT NULL,

    CONSTRAINT fk_prescription_drugs_prescription
        FOREIGN KEY (prescription_id)
        REFERENCES prescriptions(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dispensation_records (
    id UUID PRIMARY KEY,

    prescription_id UUID NOT NULL,
    drug_name VARCHAR(255) NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',

    pharmacy_name VARCHAR(255),
    dispensed_at TIMESTAMP,

    CONSTRAINT fk_dispensation_prescription
        FOREIGN KEY (prescription_id)
        REFERENCES prescriptions(id)
        ON DELETE CASCADE,

    CONSTRAINT uk_dispensation_prescription_drug
        UNIQUE (prescription_id, drug_name)
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient_id
    ON prescriptions(patient_id);

CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor_id
    ON prescriptions(doctor_id);

CREATE INDEX IF NOT EXISTS idx_prescriptions_consultation_id
    ON prescriptions(consultation_id);

CREATE INDEX IF NOT EXISTS idx_dispensation_prescription_id
    ON dispensation_records(prescription_id);

CREATE INDEX IF NOT EXISTS idx_dispensation_status
    ON dispensation_records(status);