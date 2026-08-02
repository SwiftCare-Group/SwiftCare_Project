package com.swiftcare.backend.notification.internal;
import com.swiftcare.backend.notification.push.PushNotificationService;
import com.swiftcare.backend.notification.security.InternalServiceKeyValidator;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/internal/notifications")
@RequiredArgsConstructor
public class InternalNotificationController {

    private final PushNotificationService pushNotificationService;
    private final InternalServiceKeyValidator internalServiceKeyValidator;

    @PostMapping("/patient-called")
    public ResponseEntity<Void> patientCalled(
            @Valid @RequestBody PatientCalledRequest request,
            @RequestHeader(value = "X-Internal-Service-Key", required = false)
            String serviceKey
    ) {
        if (!internalServiceKeyValidator.isValid(serviceKey)) {
            return ResponseEntity.status(401).build();
        }

        pushNotificationService.notifyPatientCalled(
                request.patientId(),
                request.departmentId()
        );

        return ResponseEntity.noContent().build();
    }

    public record PatientCalledRequest(

            @NotNull(message = "Patient ID is required")
            UUID patientId,

            @NotNull(message = "Department ID is required")
            UUID departmentId,

            Integer queueNumber
    ) {
    }
}