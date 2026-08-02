package com.swiftcare.backend.notification.push;
public class PushDeliveryException
        extends RuntimeException {

    public PushDeliveryException(
            String message,
            Throwable cause
    ) {
        super(message, cause);
    }
}