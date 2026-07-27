package com.swiftcare.backend.notification.device;
public class PushDeviceNotFoundException
        extends RuntimeException {

    public PushDeviceNotFoundException(String message) {
        super(message);
    }
}