package com.swiftcare.consultation_service.controller;

import com.swiftcare.consultation_service.model.DispensationRecord;
import com.swiftcare.consultation_service.model.Prescription;
import com.swiftcare.consultation_service.repository.DispensationRecordRepository;
import com.swiftcare.consultation_service.repository.PrescriptionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/dispensations")
public class DispensationRecordController {

    @Autowired
    private DispensationRecordRepository dispensationRecordRepository;

    @Autowired
    private PrescriptionRepository prescriptionRepository;

    // ============================================================
    // PHARMACIST SCANS QR CODE
    // This is the main endpoint the pharmacist uses
    // They send the QR code text → get back the full prescription
    // ============================================================
    @PostMapping("/scan")
    public ResponseEntity<Map<String, Object>> scanPrescription(
            @RequestBody Map<String, String> request) {

        String qrCodeData = request.get("qrCodeData");
        Map<String, Object> response = new HashMap<>();

        // Find the prescription that matches this QR code
        List<Prescription> prescriptions =
                prescriptionRepository.findAll();

        Prescription found = null;
        for (Prescription p : prescriptions) {
            if (p.getQrCodeData() != null &&
                    p.getQrCodeData().equals(qrCodeData)) {
                found = p;
                break;
            }
        }

        if (found == null) {
            response.put("error", "Invalid or expired prescription");
            return ResponseEntity.badRequest().body(response);
        }

        // Get all dispensation records for this prescription
        List<DispensationRecord> records =
                dispensationRecordRepository
                        .findByPrescriptionId(found.getId());

        // Build the response
        response.put("prescriptionId", found.getId());
        response.put("patientId", found.getPatientId());
        response.put("doctorId", found.getDoctorId());
        response.put("status", found.getStatus());
        response.put("issuedAt", found.getIssuedAt());
        response.put("drugs", records);
        response.put("message", "Prescription verified successfully");

        return ResponseEntity.ok(response);
    }

    // ============================================================
    // ADD A DRUG TO A PRESCRIPTION
    // Doctor calls this after consultation to list the drugs
    // ============================================================
    @PostMapping
    public DispensationRecord addDrug(
            @RequestBody DispensationRecord record) {
        record.setStatus("PENDING");
        return dispensationRecordRepository.save(record);
    }

    // ============================================================
    // GET ALL DRUGS FOR A PRESCRIPTION
    // "Show me all drugs on prescription number 7"
    // ============================================================
    @GetMapping("/prescription/{prescriptionId}")
    public List<DispensationRecord> getByPrescription(
            @PathVariable Long prescriptionId) {
        return dispensationRecordRepository
                .findByPrescriptionId(prescriptionId);
    }

    // ============================================================
    // PHARMACIST MARKS A DRUG AS DISPENSED OR UNAVAILABLE
    // Called for each individual drug
    // ============================================================
    @PutMapping("/{id}/dispense")
    public ResponseEntity<Map<String, Object>> dispenseDrug(
            @PathVariable Long id,
            @RequestBody Map<String, String> request) {

        String status = request.get("status"); // DISPENSED or UNAVAILABLE
        Long pharmacistId = Long.parseLong(
                request.getOrDefault("pharmacistId", "0"));

        Map<String, Object> response = new HashMap<>();

        return dispensationRecordRepository.findById(id)
                .map(existing -> {
                    existing.setStatus(status);
                    existing.setPharmacistId(pharmacistId);

                    // Only set dispensed time if actually given
                    if ("DISPENSED".equals(status)) {
                        existing.setDispensedAt(LocalDateTime.now());
                    }

                    DispensationRecord saved =
                            dispensationRecordRepository.save(existing);

                    response.put("drug", saved.getDrugName());
                    response.put("status", saved.getStatus());
                    response.put("message",
                            "DISPENSED".equals(status) ?
                                    "Drug given to patient ✓" :
                                    "Drug marked as unavailable");

                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ============================================================
    // CHECK REMAINING DRUGS (for multi-pharmacy collection)
    // Patient goes to second pharmacy for remaining drugs
    // ============================================================
    @GetMapping("/prescription/{prescriptionId}/remaining")
    public ResponseEntity<Map<String, Object>> getRemaining(
            @PathVariable Long prescriptionId) {

        List<DispensationRecord> all =
                dispensationRecordRepository
                        .findByPrescriptionId(prescriptionId);

        List<DispensationRecord> remaining = all.stream()
                .filter(r -> !"DISPENSED".equals(r.getStatus()))
                .toList();

        Map<String, Object> response = new HashMap<>();
        response.put("prescriptionId", prescriptionId);
        response.put("totalDrugs", all.size());
        response.put("remainingDrugs", remaining.size());
        response.put("drugs", remaining);

        return ResponseEntity.ok(response);
    }
}