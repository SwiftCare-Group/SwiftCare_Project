-- Support both queue-based and remote clinical records.
ALTER TABLE clinical_records
    ALTER COLUMN queue_entry_id DROP NOT NULL,
    ALTER COLUMN appointment_id DROP NOT NULL;

ALTER TABLE clinical_records
    ADD COLUMN IF NOT EXISTS consultation_id UUID,
    ADD COLUMN IF NOT EXISTS temperature_celsius NUMERIC(4, 1),
    ADD COLUMN IF NOT EXISTS blood_pressure VARCHAR(20),
    ADD COLUMN IF NOT EXISTS pulse_rate INTEGER,
    ADD COLUMN IF NOT EXISTS respiratory_rate INTEGER,
    ADD COLUMN IF NOT EXISTS oxygen_saturation INTEGER,
    ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(6, 2),
    ADD COLUMN IF NOT EXISTS follow_up_instructions TEXT,
    ADD COLUMN IF NOT EXISTS referral_notes TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_clinical_record_consultation'
    ) THEN
        ALTER TABLE clinical_records
            ADD CONSTRAINT fk_clinical_record_consultation
            FOREIGN KEY (consultation_id)
            REFERENCES consultations(id);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uk_clinical_record_consultation
    ON clinical_records(consultation_id)
    WHERE consultation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_clinical_records_consultation
    ON clinical_records(consultation_id);

-- Preserve a complete pharmacy audit trail.
ALTER TABLE dispensation_records
    ADD COLUMN IF NOT EXISTS pharmacist_id UUID,
    ADD COLUMN IF NOT EXISTS pharmacist_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS quantity_dispensed VARCHAR(100),
    ADD COLUMN IF NOT EXISTS dispensation_notes TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_dispensation_pharmacist'
    ) THEN
        ALTER TABLE dispensation_records
            ADD CONSTRAINT fk_dispensation_pharmacist
            FOREIGN KEY (pharmacist_id)
            REFERENCES doctors(id);
    END IF;
END $$;

-- Make QR and payment references safe for direct lookup and webhook retries.
CREATE UNIQUE INDEX IF NOT EXISTS uk_dispensation_prescription_drug_ci
    ON dispensation_records(prescription_id, LOWER(drug_name));

CREATE UNIQUE INDEX IF NOT EXISTS uk_prescriptions_qr_code_hash
    ON prescriptions(qr_code_hash);

CREATE UNIQUE INDEX IF NOT EXISTS uk_subscriptions_paystack_reference
    ON subscriptions(paystack_reference)
    WHERE paystack_reference IS NOT NULL;

-- The original laboratory table stored standalone results. The refactored
-- workflow links each new result to a lab order, so legacy-only columns must
-- no longer block inserts made by the current entity model.
ALTER TABLE lab_results
    ALTER COLUMN test_name DROP NOT NULL,
    ALTER COLUMN status DROP NOT NULL,
    ALTER COLUMN patient_id DROP NOT NULL;
