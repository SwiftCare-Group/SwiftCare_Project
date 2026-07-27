ALTER TABLE queue_entries
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

ALTER TABLE queue_entries
    ADD COLUMN IF NOT EXISTS last_skipped_at TIMESTAMP;

ALTER TABLE queue_entries
    ADD COLUMN IF NOT EXISTS skip_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_queue_department_status
    ON queue_entries (department_id, status);

CREATE INDEX IF NOT EXISTS idx_queue_department_position
    ON queue_entries (department_id, current_position);