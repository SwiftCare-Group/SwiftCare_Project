ALTER TABLE symptom_submissions
    ADD COLUMN IF NOT EXISTS ai_recommended_severity_score INTEGER;

ALTER TABLE symptom_submissions
    ADD COLUMN IF NOT EXISTS ai_status VARCHAR(30);

-- Normalize legacy/null severity values.
-- Existing valid 1-4 values are preserved.
-- Out-of-range legacy 1-10 values are converted to the current 1-4 scale.
UPDATE symptom_submissions
SET severity_score = CASE
    WHEN severity_score BETWEEN 1 AND 4 THEN severity_score
    WHEN severity_score IS NULL THEN
        CASE UPPER(COALESCE(severity_label, ''))
            WHEN 'EMERGENCY' THEN 4
            WHEN 'CRITICAL' THEN 4
            WHEN 'SEVERE' THEN 3
            WHEN 'HIGH' THEN 3
            WHEN 'MODERATE' THEN 2
            WHEN 'MEDIUM' THEN 2
            WHEN 'MILD' THEN 1
            WHEN 'LOW' THEN 1
            ELSE 1
        END
    WHEN severity_score <= 0 THEN 1
    WHEN severity_score <= 5 THEN 2
    WHEN severity_score <= 8 THEN 3
    ELSE 4
END;

-- Keep labels consistent with the normalized patient severity.
UPDATE symptom_submissions
SET severity_label = CASE severity_score
    WHEN 4 THEN 'EMERGENCY'
    WHEN 3 THEN 'SEVERE'
    WHEN 2 THEN 'MODERATE'
    ELSE 'MILD'
END;

-- A score of 4 must remain flagged as an emergency.
UPDATE symptom_submissions
SET is_emergency = TRUE
WHERE severity_score = 4;

-- Populate the new AI fields for existing records.
UPDATE symptom_submissions
SET ai_recommended_severity_score = severity_score
WHERE ai_recommended_severity_score IS NULL;

UPDATE symptom_submissions
SET ai_status = 'LEGACY'
WHERE ai_status IS NULL OR BTRIM(ai_status) = '';

-- Enforce valid symptom severity values only after legacy data is normalized.
ALTER TABLE symptom_submissions
    DROP CONSTRAINT IF EXISTS chk_symptom_severity_score;

ALTER TABLE symptom_submissions
    ADD CONSTRAINT chk_symptom_severity_score
        CHECK (severity_score BETWEEN 1 AND 4)
        NOT VALID;

ALTER TABLE symptom_submissions
    VALIDATE CONSTRAINT chk_symptom_severity_score;

ALTER TABLE symptom_submissions
    DROP CONSTRAINT IF EXISTS chk_ai_recommended_severity_score;

ALTER TABLE symptom_submissions
    ADD CONSTRAINT chk_ai_recommended_severity_score
        CHECK (
            ai_recommended_severity_score IS NULL
            OR ai_recommended_severity_score BETWEEN 1 AND 4
        )
        NOT VALID;

ALTER TABLE symptom_submissions
    VALIDATE CONSTRAINT chk_ai_recommended_severity_score;

-- Link appointments to the exact symptom submission used for booking.
ALTER TABLE appointment
    ADD COLUMN IF NOT EXISTS symptom_submission_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_appointment_symptom_submission'
    ) THEN
        ALTER TABLE appointment
            ADD CONSTRAINT fk_appointment_symptom_submission
                FOREIGN KEY (symptom_submission_id)
                REFERENCES symptom_submissions(id);
    END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS
    uk_appointment_symptom_submission
ON appointment(symptom_submission_id)
WHERE symptom_submission_id IS NOT NULL;