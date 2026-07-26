package com.swiftcare.notification.internal;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
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

    @PostMapping("/patient-called")
    public ResponseEntity<Void> patientCalled(
            @Valid @RequestBody PatientCalledRequest request
    ) {

        pushNotificationService.notifyPatientCalled(
                request.patientId(),
                request.department(),
                request.queueNumber()
        );

        return ResponseEntity.ok().build();
    }

    public record PatientCalledRequest(

            @NotNull
            UUID patientId,

            @NotBlank
            String department,

            @NotNull
            Integer queueNumber
    ) {
    }
}