package com.swiftcare.notification.security;

import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

@Component
public class AuthenticatedPatientResolver {

    private static final List<String> PATIENT_ID_CLAIMS =
            List.of(
                    "patientId",
                    "patient_id",
                    "userId",
                    "user_id"
            );

    public UUID resolvePatientId(Jwt jwt) {
        for (String claimName : PATIENT_ID_CLAIMS) {
            String claimValue = jwt.getClaimAsString(claimName);

            UUID patientId = parseUuid(claimValue);

            if (patientId != null) {
                return patientId;
            }
        }

        /*
         * Many JWT implementations place the user's UUID in "sub".
         */
        UUID subjectId = parseUuid(jwt.getSubject());

        if (subjectId != null) {
            return subjectId;
        }

        throw new IllegalStateException(
                "The access token does not contain a valid patient UUID."
        );
    }

    private UUID parseUuid(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }
}