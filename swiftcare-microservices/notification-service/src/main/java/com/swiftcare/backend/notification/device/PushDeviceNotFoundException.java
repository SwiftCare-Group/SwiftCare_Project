package com.swiftcare.notification.device;

public class PushDeviceNotFoundException
        extends RuntimeException {

    public PushDeviceNotFoundException(String message) {
        super(message);
    }
}