package com.swiftcare.backend.notification.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Component
public class InternalServiceKeyValidator {

    private final byte[] expectedKey;

    public InternalServiceKeyValidator(
            @Value("${internal.service-key}") String expectedKey
    ) {
        this.expectedKey = expectedKey.getBytes(StandardCharsets.UTF_8);
    }

    public boolean isValid(String suppliedKey) {
        if (suppliedKey == null || suppliedKey.isBlank()) {
            return false;
        }

        return MessageDigest.isEqual(
                expectedKey,
                suppliedKey.getBytes(StandardCharsets.UTF_8)
        );
    }
}
