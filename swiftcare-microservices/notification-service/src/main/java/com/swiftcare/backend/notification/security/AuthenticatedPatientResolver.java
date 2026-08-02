package com.swiftcare.backend.notification.security;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class AuthenticatedPatientResolver {

    private final JdbcTemplate jdbcTemplate;

    public UUID resolvePatientId(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException(
                    "Authenticated user email is missing"
            );
        }

        try {
            return jdbcTemplate.queryForObject(
                    """
                    SELECT id
                    FROM patients
                    WHERE LOWER(email) = LOWER(?)
                      AND is_deleted = FALSE
                    """,
                    UUID.class,
                    email.trim()
            );
        } catch (EmptyResultDataAccessException exception) {
            throw new PatientAccountNotFoundException(
                    "No active patient account matches the authenticated user"
            );
        }
    }
}
