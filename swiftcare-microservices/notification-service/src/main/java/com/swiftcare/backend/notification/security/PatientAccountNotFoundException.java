package com.swiftcare.backend.notification.security;

public class PatientAccountNotFoundException extends RuntimeException {
    public PatientAccountNotFoundException(String message) {
        super(message);
    }
}
