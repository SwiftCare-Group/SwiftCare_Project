ALTER TABLE refresh_tokens
    ALTER COLUMN patient_id DROP NOT NULL;

ALTER TABLE refresh_tokens
    ADD COLUMN doctor_id UUID;

ALTER TABLE refresh_tokens
    ADD CONSTRAINT fk_refresh_token_doctor
        FOREIGN KEY (doctor_id)
        REFERENCES doctors(id);

ALTER TABLE refresh_tokens
    ADD CONSTRAINT chk_refresh_token_owner
        CHECK (
            (patient_id IS NOT NULL AND doctor_id IS NULL)
            OR
            (patient_id IS NULL AND doctor_id IS NOT NULL)
        );

CREATE INDEX idx_refresh_tokens_doctor_id
    ON refresh_tokens(doctor_id);
