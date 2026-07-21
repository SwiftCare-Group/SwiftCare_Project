ALTER TABLE queue_entries
    RENAME COLUMN emergency TO is_emergency;

ALTER TABLE queue_entries
    ADD COLUMN patient_id UUID,
    ADD COLUMN patient_name VARCHAR(255),
    ADD COLUMN patient_number VARCHAR(255),
    ADD COLUMN age INTEGER,
    ADD COLUMN gender VARCHAR(100),
    ADD COLUMN chief_complaint VARCHAR(1000),
    ADD COLUMN severity_label VARCHAR(100),
    ADD COLUMN scheduled_time TIMESTAMP,
    ADD COLUMN updated_at TIMESTAMP;