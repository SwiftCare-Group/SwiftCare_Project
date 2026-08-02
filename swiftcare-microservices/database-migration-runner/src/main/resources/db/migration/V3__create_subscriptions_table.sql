CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL UNIQUE,
    plan VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    started_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    cancelled_at TIMESTAMP,
    paystack_reference VARCHAR(255) NOT NULL,
    CONSTRAINT fk_subscription_patient FOREIGN KEY (patient_id) REFERENCES patients(id)
);