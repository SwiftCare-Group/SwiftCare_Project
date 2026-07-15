package com.swiftcare.backend.notification;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@Slf4j
public class NotificationService {

    public void sendPushNotification(String fcmToken, String title, String body) {
        try {
            Message message = Message.builder()
                    .setToken(fcmToken)
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .build();

            String response = FirebaseMessaging.getInstance().send(message);
            log.info("Push notification sent: {}", response);
        } catch (FirebaseMessagingException e) {
            log.error("Failed to send push notification: {}", e.getMessage());
        }
    }

    public void sendEmergencyAlert(String fcmToken, String patientName, String symptoms) {
        try {
            Message message = Message.builder()
                    .setToken(fcmToken)
                    .setNotification(Notification.builder()
                            .setTitle("🚨 EMERGENCY ALERT")
                            .setBody(String.format("Patient %s has critical symptoms: %s",
                                    patientName, symptoms))
                            .build())
                    .putAllData(Map.of(
                            "type", "EMERGENCY",
                            "patientName", patientName,
                            "symptoms", symptoms
                    ))
                    .build();

            String response = FirebaseMessaging.getInstance().send(message);
            log.info("Emergency alert sent: {}", response);
        } catch (FirebaseMessagingException e) {
            log.error("Failed to send emergency alert: {}", e.getMessage());
        }
    }

    public void sendQueueUpdate(String fcmToken, int position) {
        try {
            Message message = Message.builder()
                    .setToken(fcmToken)
                    .setNotification(Notification.builder()
                            .setTitle("Queue Update")
                            .setBody(position == 1
                                    ? "You are next! Please proceed to the hospital."
                                    : String.format("%d people ahead of you in the queue.", position))
                            .build())
                    .putAllData(Map.of(
                            "type", "QUEUE_UPDATE",
                            "position", String.valueOf(position)
                    ))
                    .build();

            String response = FirebaseMessaging.getInstance().send(message);
            log.info("Queue update notification sent: {}", response);
        } catch (FirebaseMessagingException e) {
            log.error("Failed to send queue update: {}", e.getMessage());
        }
    }

    public void sendConsultationReminder(String fcmToken, String doctorName, String time) {
        try {
            Message message = Message.builder()
                    .setToken(fcmToken)
                    .setNotification(Notification.builder()
                            .setTitle("Consultation Reminder")
                            .setBody(String.format(
                                    "Your consultation with Dr. %s starts at %s", doctorName, time))
                            .build())
                    .putAllData(Map.of("type", "CONSULTATION_REMINDER"))
                    .build();

            String response = FirebaseMessaging.getInstance().send(message);
            log.info("Consultation reminder sent: {}", response);
        } catch (FirebaseMessagingException e) {
            log.error("Failed to send consultation reminder: {}", e.getMessage());
        }
    }

    public void sendPrescriptionReady(String fcmToken) {
        try {
            Message message = Message.builder()
                    .setToken(fcmToken)
                    .setNotification(Notification.builder()
                            .setTitle("Prescription Ready")
                            .setBody("Your prescription is ready. Open SwiftCare to view your QR code.")
                            .build())
                    .putAllData(Map.of("type", "PRESCRIPTION_READY"))
                    .build();

            String response = FirebaseMessaging.getInstance().send(message);
            log.info("Prescription ready notification sent: {}", response);
        } catch (FirebaseMessagingException e) {
            log.error("Failed to send prescription ready notification: {}", e.getMessage());
        }
    }
}