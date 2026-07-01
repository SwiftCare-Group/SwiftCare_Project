CREATE TABLE IF NOT EXISTS symptom_submissions (
                                     id BIGSERIAL PRIMARY KEY,
                                     patient_id VARCHAR(255) NOT NULL,
                                     symptoms TEXT NOT NULL,
                                     health_profile_snapshot TEXT,
                                     severity_score INTEGER,
                                     label VARCHAR(50),
                                     is_emergency BOOLEAN DEFAULT FALSE,
                                     first_aid_content TEXT,
                                     ai_raw_response TEXT,
                                     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);