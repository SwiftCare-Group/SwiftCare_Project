ALTER TABLE patients ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT TRUE;
CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_email_verification_patient ON email_verification_tokens(patient_id);
