CREATE TABLE clinical_records (
    id UUID PRIMARY KEY,

    queue_entry_id UUID NOT NULL UNIQUE,

    appointment_id UUID NOT NULL,

    patient_id UUID NOT NULL,

    doctor_id UUID NOT NULL,

    diagnosis VARCHAR(500) NOT NULL,

    consultation_notes TEXT,

    prescription TEXT,

    lab_request TEXT,

    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_clinical_record_queue_entry
        FOREIGN KEY (queue_entry_id)
        REFERENCES queue_entries(id),

    CONSTRAINT fk_clinical_record_appointment
        FOREIGN KEY (appointment_id)
        REFERENCES appointment(id),

    CONSTRAINT fk_clinical_record_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id),

    CONSTRAINT fk_clinical_record_doctor
        FOREIGN KEY (doctor_id)
        REFERENCES doctors(id)
);

CREATE INDEX idx_clinical_records_patient
    ON clinical_records(patient_id);

CREATE INDEX idx_clinical_records_doctor
    ON clinical_records(doctor_id);

CREATE INDEX idx_clinical_records_appointment
    ON clinical_records(appointment_id);