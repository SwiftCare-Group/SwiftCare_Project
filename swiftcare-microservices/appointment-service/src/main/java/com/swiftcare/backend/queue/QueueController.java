package com.swiftcare.backend.queue;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.swiftcare.backend.queue.dto.QueueEntryResponse;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping
@RequiredArgsConstructor
public class QueueController {

    private final QueueService queueService;

    @GetMapping("/departments/{departmentId}/queue")
    public ResponseEntity<List<DoctorQueueResponse>> getDepartmentQueue(
            @PathVariable UUID departmentId
    ) {
        List<DoctorQueueResponse> queue =
                queueService.getDepartmentQueue(departmentId);

        return ResponseEntity.ok(queue);
    }

    @GetMapping("/queue/{queueEntryId}")
    public ResponseEntity<QueueEntryResponse> getQueueEntry(
            @PathVariable UUID queueEntryId
    ) {
        return ResponseEntity.ok(
                queueService.getQueueEntry(queueEntryId)
        );
    }

    @PatchMapping("/queue/{queueEntryId}/call")
    public ResponseEntity<Void> callPatient(
            @PathVariable UUID queueEntryId
    ) {
        queueService.callPatient(queueEntryId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/queue/{queueEntryId}/start")
    public ResponseEntity<Void> startConsultation(
            @PathVariable UUID queueEntryId
    ) {
        queueService.startConsultation(queueEntryId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/queue/{queueEntryId}/complete")
    public ResponseEntity<Void> completeConsultation(
            @PathVariable UUID queueEntryId
    ) {
        queueService.completeConsultation(queueEntryId);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/queue/{queueEntryId}/cancel")
    public ResponseEntity<Void> cancelQueueEntry(
            @PathVariable UUID queueEntryId
    ) {
        queueService.cancelQueueEntry(queueEntryId);
        return ResponseEntity.noContent().build();
    }
}