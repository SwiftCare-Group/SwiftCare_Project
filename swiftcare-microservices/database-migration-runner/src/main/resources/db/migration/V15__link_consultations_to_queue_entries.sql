ALTER TABLE consultations
ADD COLUMN queue_entry_id UUID;

ALTER TABLE consultations
ADD CONSTRAINT fk_consultations_queue_entry
FOREIGN KEY (queue_entry_id)
REFERENCES queue_entries(id);

ALTER TABLE consultations
ADD CONSTRAINT uk_consultations_queue_entry
UNIQUE (queue_entry_id);