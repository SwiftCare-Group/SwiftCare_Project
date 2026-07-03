CREATE TABLE IF NOT EXISTS notifications (
                                             id BIGSERIAL PRIMARY KEY,
                                             recipient_id VARCHAR(255) NOT NULL,
    recipient_role VARCHAR(50),
    type VARCHAR(100),
    title VARCHAR(255),
    body TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    related_entity_id BIGINT
    );