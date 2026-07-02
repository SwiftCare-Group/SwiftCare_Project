package com.swiftcare.backend.prescription;

import com.swiftcare.backend.pharmacy.DispensationRecord;
import com.swiftcare.backend.pharmacy.dto.DispenseRequest;
import com.swiftcare.backend.prescription.dto.PrescriptionRequest;
import com.swiftcare.backend.prescription.dto.PrescriptionResponse;
import com.swiftcare.backend.pharmacy.dto.DispensationRecordResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/prescriptions")
@RequiredArgsConstructor
public class PrescriptionController {

    private final PrescriptionService prescriptionService;

    @PostMapping
    public ResponseEntity<PrescriptionResponse> issue(
            @Valid @RequestBody PrescriptionRequest request) throws Exception {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(prescriptionService.issuePrescription(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PrescriptionResponse> getOne(@PathVariable UUID id) {
        return ResponseEntity.ok(prescriptionService.getPrescription(id));
    }

    @GetMapping("/{id}/qr")
    public ResponseEntity<Map<String, String>> getQrCode(@PathVariable UUID id) {
        return ResponseEntity.ok(Map.of("qrCode", prescriptionService.getQrCode(id)));
    }

    @PutMapping("/{id}/dispense")
    public ResponseEntity<DispensationRecordResponse> dispense(
            @PathVariable UUID id,
            @Valid @RequestBody DispenseRequest request) {
        return ResponseEntity.ok(prescriptionService.dispense(id, request));
    }

    @GetMapping("/{id}/remaining")
    public ResponseEntity<List<DispensationRecordResponse>> getRemaining(@PathVariable UUID id) {
        return ResponseEntity.ok(prescriptionService.getRemainingDrugs(id));
    }
}