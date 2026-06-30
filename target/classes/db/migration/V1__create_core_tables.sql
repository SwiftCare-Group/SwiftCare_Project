CREATE TABLE hospital (
                          id BIGSERIAL PRIMARY KEY,
                          name VARCHAR(150) NOT NULL,
                          location VARCHAR(150)
);

CREATE TABLE department (
                            id BIGSERIAL PRIMARY KEY,
                            hospital_id BIGINT REFERENCES hospital(id),
                            name VARCHAR(100) NOT NULL,
                            average_consultation_minutes INTEGER NOT NULL
);

CREATE TABLE appointment (
                             id BIGSERIAL PRIMARY KEY,
                             patient_name VARCHAR(100) NOT NULL,
                             department_id BIGINT NOT NULL REFERENCES department(id),
                             scheduled_time TIMESTAMP NOT NULL,
                             severity_score INTEGER NOT NULL,
                             premium BOOLEAN NOT NULL DEFAULT FALSE,
                             status VARCHAR(30) NOT NULL
);

CREATE TABLE queue_entry (
                             id BIGSERIAL PRIMARY KEY,
                             appointment_id BIGINT NOT NULL REFERENCES appointment(id),
                             department_id BIGINT NOT NULL REFERENCES department(id),
                             position INTEGER,
                             estimated_call_time TIMESTAMP
);