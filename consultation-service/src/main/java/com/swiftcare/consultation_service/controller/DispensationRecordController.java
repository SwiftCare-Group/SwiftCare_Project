package com.swiftcare.consultation_service.controller;

import com.swiftcare.consultation_service.model.DispensationRecord;
import com.swiftcare.consultation_service.repository.DispensationRecordRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/dispensations")
public class DispensationRecordController {

    @Autowired
    private DispensationRecordRepository dispensationRecordRepository;

    // GET all dispensation records for a prescription
    // "Show me all drugs on prescription number 7"
    @GetMapping("/prescription/{prescriptionId}")
    public List<DispensationRecord> getByPrescription(
            @PathVariable Long prescriptionId) {
        return dispensationRecordRepository.findByPrescriptionId(prescriptionId);
    }

    // GET one dispensation record by ID
    @GetMapping("/{id}")
    public ResponseEntity<DispensationRecord> getById(@PathVariable Long id) {
        return dispensationRecordRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // POST - pharmacist creates a dispensation record for each drug
    @PostMapping
    public DispensationRecord createRecord(
            @RequestBody DispensationRecord record) {
        return dispensationRecordRepository.save(record);
    }

    // PUT - pharmacist marks a drug as DISPENSED or UNAVAILABLE
    @PutMapping("/{id}")
    public ResponseEntity<DispensationRecord> updateRecord(
            @PathVariable Long id,
            @RequestBody DispensationRecord updated) {
        return dispensationRecordRepository.findById(id)
                .map(existing -> {
                    existing.setStatus(updated.getStatus());
                    existing.setDispensedAt(updated.getDispensedAt());
                    existing.setPharmacistId(updated.getPharmacistId());
                    return ResponseEntity.ok(
                            dispensationRecordRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}