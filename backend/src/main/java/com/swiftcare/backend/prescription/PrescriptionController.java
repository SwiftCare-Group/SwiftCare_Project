package com.swiftcare.backend.prescription;

import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.patient.PatientRepository;
import com.swiftcare.backend.pharmacy.dto.DispensationRecordResponse;
import com.swiftcare.backend.pharmacy.dto.DispenseRequest;
import com.swiftcare.backend.prescription.dto.PrescriptionRequest;
import com.swiftcare.backend.prescription.dto.PrescriptionResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/prescriptions")
@RequiredArgsConstructor
public class PrescriptionController {

    private final PrescriptionService prescriptionService;
    private final PatientRepository patientRepository;

    @PostMapping
    public ResponseEntity<PrescriptionResponse> issuePrescription(
            @Valid @RequestBody PrescriptionRequest request
    ) throws Exception {

        PrescriptionResponse response =
                prescriptionService.issuePrescription(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PrescriptionResponse> getPrescription(
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(
                prescriptionService.getPrescription(id)
        );
    }

    @GetMapping("/{id}/qr")
    public ResponseEntity<Map<String, String>> getQrCode(
            @PathVariable UUID id
    ) {
        String qrCode = prescriptionService.getQrCode(id);

        return ResponseEntity.ok(
                Map.of("qrCode", qrCode)
        );
    }

    @PutMapping("/{id}/dispense")
    public ResponseEntity<DispensationRecordResponse> dispenseDrug(
            @PathVariable UUID id,
            @Valid @RequestBody DispenseRequest request
    ) {
        return ResponseEntity.ok(
                prescriptionService.dispense(id, request)
        );
    }

    @GetMapping("/{id}/remaining")
    public ResponseEntity<List<DispensationRecordResponse>> getRemainingDrugs(
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(
                prescriptionService.getRemainingDrugs(id)
        );
    }

    @GetMapping("/my")
    public ResponseEntity<List<PrescriptionResponse>> getMyPrescriptions(
            @AuthenticationPrincipal String email
    ) {
        UUID patientId = patientRepository
                .findByEmail(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Authenticated patient not found"
                        )
                )
                .getId();

        return ResponseEntity.ok(
                prescriptionService.getPatientPrescriptions(patientId)
        );
    }
}