package com.swiftcare.backend.notification;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationRepository notificationRepository;

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<Notification>> getHistory(@PathVariable String patientId) {
        return ResponseEntity.ok(
                notificationRepository.findByRecipientIdOrderBySentAtDesc(patientId)
        );
    }

    @GetMapping("/patient/{patientId}/unread")
    public ResponseEntity<?> getUnread(@PathVariable String patientId) {
        List<Notification> unread = notificationRepository
                .findByRecipientIdAndIsReadFalse(patientId);
        return ResponseEntity.ok(Map.of("count", unread.size(), "notifications", unread));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markRead(@PathVariable Long id) {
        return notificationRepository.findById(id).map(n -> {
            n.setIsRead(true);
            notificationRepository.save(n);
            return ResponseEntity.ok(Map.of("message", "Marked as read"));
        }).orElse(ResponseEntity.notFound().build());
    }
}