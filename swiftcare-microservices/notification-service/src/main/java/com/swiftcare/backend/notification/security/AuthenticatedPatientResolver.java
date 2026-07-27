package com.swiftcare.backend.notification.security;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Component
public class AuthenticatedPatientResolver {

    public UUID resolvePatientId(String email) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Authenticated user email is missing");
        }

        /*
         * Temporary deterministic UUID generated from the authenticated email.
         *
         * This only works correctly if the other services use the same method
         * to derive the patient's UUID from their email.
         */
        return UUID.nameUUIDFromBytes(
                email.trim()
                        .toLowerCase()
                        .getBytes(StandardCharsets.UTF_8)
        );
    }
}