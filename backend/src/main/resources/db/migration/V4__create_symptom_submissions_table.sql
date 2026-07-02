CREATE TABLE IF NOT EXISTS symptom_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL,
    symptoms TEXT NOT NULL,
    severity_score INTEGER,
    severity_label VARCHAR(20),
    is_emergency BOOLEAN DEFAULT FALSE,
    first_aid_content TEXT,
    ai_raw_response TEXT,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_symptom_patient FOREIGN KEY (patient_id) REFERENCES patients(id)
);