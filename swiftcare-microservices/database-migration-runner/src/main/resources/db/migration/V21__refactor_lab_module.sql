CREATE TABLE lab_orders (
    id UUID PRIMARY KEY,

    consultation_id UUID NOT NULL,
    patient_id UUID NOT NULL,

    test_name VARCHAR(150) NOT NULL,
    clinical_reason TEXT,
    instructions TEXT,

    status VARCHAR(30) NOT NULL DEFAULT 'ORDERED',

    ordered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_lab_orders_consultation
        FOREIGN KEY (consultation_id)
        REFERENCES consultations(id),

    CONSTRAINT fk_lab_orders_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id),

    CONSTRAINT chk_lab_orders_status
        CHECK (
            status IN (
                'ORDERED',
                'IN_PROGRESS',
                'COMPLETED',
                'CANCELLED'
            )
        )
);

CREATE INDEX idx_lab_orders_patient_id
    ON lab_orders(patient_id);

CREATE INDEX idx_lab_orders_consultation_id
    ON lab_orders(consultation_id);

CREATE INDEX idx_lab_orders_status
    ON lab_orders(status);

ALTER TABLE lab_results
    ADD COLUMN lab_order_id UUID,
    ADD COLUMN interpretation TEXT,
    ADD COLUMN performed_by VARCHAR(150),
    ADD COLUMN created_at TIMESTAMP,
    ADD COLUMN updated_at TIMESTAMP;

ALTER TABLE lab_results
    ALTER COLUMN created_at
    SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE lab_results
    ALTER COLUMN updated_at
    SET DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE lab_results
    ADD CONSTRAINT fk_lab_results_lab_order
        FOREIGN KEY (lab_order_id)
        REFERENCES lab_orders(id);

ALTER TABLE lab_results
    ADD CONSTRAINT uk_lab_results_lab_order_id
        UNIQUE (lab_order_id);