CREATE TABLE lab_results (

    id UUID PRIMARY KEY,

    test_name VARCHAR(255) NOT NULL,

    result TEXT,

    status VARCHAR(50) NOT NULL,

    doctor_name VARCHAR(255),

    notes TEXT,

    performed_at TIMESTAMP NOT NULL,

    patient_id UUID NOT NULL,

    CONSTRAINT fk_lab_results_patient
        FOREIGN KEY (patient_id)
        REFERENCES patients(id)

);