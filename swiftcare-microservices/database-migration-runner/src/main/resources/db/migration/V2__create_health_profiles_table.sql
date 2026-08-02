CREATE TABLE health_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL UNIQUE,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_health_profile_patient FOREIGN KEY (patient_id) REFERENCES patients(id)
);

CREATE TABLE health_profile_conditions (
    profile_id UUID NOT NULL,
    condition VARCHAR(255),
    CONSTRAINT fk_conditions_profile FOREIGN KEY (profile_id) REFERENCES health_profiles(id)
);

CREATE TABLE health_profile_illnesses (
    profile_id UUID NOT NULL,
    illness VARCHAR(255),
    CONSTRAINT fk_illnesses_profile FOREIGN KEY (profile_id) REFERENCES health_profiles(id)
);

CREATE TABLE health_profile_diagnoses (
    profile_id UUID NOT NULL,
    diagnosis VARCHAR(255),
    CONSTRAINT fk_diagnoses_profile FOREIGN KEY (profile_id) REFERENCES health_profiles(id)
);