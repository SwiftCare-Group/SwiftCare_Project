package com.swiftcare.backend.notification;

import com.swiftcare.backend.notification.security.InternalServiceKeyValidator;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/notifications")
@RequiredArgsConstructor
public class NotificationController {
    private final NotificationService notificationService;
    private final InternalServiceKeyValidator internalServiceKeyValidator;

    @PostMapping("/push")
    public ResponseEntity<Void> push(@Valid @RequestBody PushRequest request,
                                     @RequestHeader(value = "X-Internal-Service-Key", required = false) String key) {
        if (!internalServiceKeyValidator.isValid(key)) {
            return ResponseEntity.status(401).build();
        }

        notificationService.sendPushNotification(
                request.getFcmToken(),
                request.getTitle(),
                request.getBody()
        );
        return ResponseEntity.accepted().build();
    }

    @Data
    public static class PushRequest {
        @NotBlank private String fcmToken;
        @NotBlank private String title;
        @NotBlank private String body;
    }
}
