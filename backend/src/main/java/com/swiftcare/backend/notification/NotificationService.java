package com.swiftcare.backend.notification;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    public void sendToPatient(String patientId, String title, String body) {
        saveToDatabase(patientId, "PATIENT", title, body, null);
        System.out.println("NOTIFICATION → Patient " + patientId + ": " + title + " — " + body);
    }

    public void sendToDoctor(String doctorId, String title, String body) {
        saveToDatabase(doctorId, "DOCTOR", title, body, null);
        System.out.println("NOTIFICATION → Doctor " + doctorId + ": " + title + " — " + body);
    }

    public void sendQueueAlert(String patientId, int position) {
        String title = "You're almost up!";
        String body = position == 1
                ? "You are next in the queue. Please get ready."
                : "You have " + position + " people ahead of you in the queue.";
        sendToPatient(patientId, title, body);
    }

    public void sendConsultationReminder(String patientId, String doctorName) {
        sendToPatient(patientId,
                "Consultation in 15 minutes",
                "Your video consultation with Dr. " + doctorName + " starts in 15 minutes.");
    }

    public void sendPrescriptionReady(String patientId) {
        sendToPatient(patientId,
                "Prescription Ready",
                "Your prescription is ready. Show your QR code at any partner pharmacy.");
    }

    public void sendEmergencyAlert(String patientId) {
        sendToPatient(patientId,
                "Emergency Alert",
                "Your condition has been flagged as critical. A doctor has been alerted immediately.");
    }

    private void saveToDatabase(String recipientId, String role,
                                String title, String body, Long relatedEntityId) {
        Notification n = new Notification();
        n.setRecipientId(recipientId);
        n.setRecipientRole(role);
        n.setTitle(title);
        n.setBody(body);
        n.setRelatedEntityId(relatedEntityId);
        n.setIsRead(false);
        notificationRepository.save(n);
    }
}