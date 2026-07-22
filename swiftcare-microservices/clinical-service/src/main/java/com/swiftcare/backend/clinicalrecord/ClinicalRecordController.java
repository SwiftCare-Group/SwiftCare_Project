package com.swiftcare.backend.clinicalrecord;

import com.swiftcare.backend.clinicalrecord.dto.ClinicalRecordResponse;
import com.swiftcare.backend.clinicalrecord.dto.CreateClinicalRecordRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/clinical-records")
@RequiredArgsConstructor
public class ClinicalRecordController {

    private final ClinicalRecordService clinicalRecordService;

    @PostMapping
    public ResponseEntity<ClinicalRecordResponse>
    createClinicalRecord(
            Principal principal,
            @Valid @RequestBody
            CreateClinicalRecordRequest request
    ) {
        ClinicalRecordResponse response =
                clinicalRecordService.createClinicalRecord(
                        principal.getName(),
                        request
                );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping("/{clinicalRecordId}")
    public ResponseEntity<ClinicalRecordResponse>
    getClinicalRecord(
            @PathVariable UUID clinicalRecordId
    ) {
        return ResponseEntity.ok(
                clinicalRecordService.getClinicalRecord(
                        clinicalRecordId
                )
        );
    }

    @GetMapping("/queue/{queueEntryId}")
    public ResponseEntity<ClinicalRecordResponse>
    getByQueueEntry(
            @PathVariable UUID queueEntryId
    ) {
        return ResponseEntity.ok(
                clinicalRecordService.getByQueueEntry(
                        queueEntryId
                )
        );
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<ClinicalRecordResponse>>
    getPatientRecords(
            @PathVariable UUID patientId
    ) {
        return ResponseEntity.ok(
                clinicalRecordService.getPatientRecords(
                        patientId
                )
        );
    }
}