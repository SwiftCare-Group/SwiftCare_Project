package com.swiftcare.consultation_service.controller;

import com.swiftcare.consultation_service.model.Prescription;
import com.swiftcare.consultation_service.repository.PrescriptionRepository;
import com.swiftcare.consultation_service.service.QRCodeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/prescriptions")
public class PrescriptionController {

    @Autowired
    private PrescriptionRepository prescriptionRepository;

    @Autowired
    private QRCodeService qrCodeService;

    // GET all prescriptions
    @GetMapping
    public List<Prescription> getAllPrescriptions() {
        return prescriptionRepository.findAll();
    }

    // GET one prescription by ID
    @GetMapping("/{id}")
    public ResponseEntity<Prescription> getPrescriptionById(
            @PathVariable Long id) {
        return prescriptionRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // GET all prescriptions for a specific patient
    @GetMapping("/patient/{patientId}")
    public List<Prescription> getByPatient(
            @PathVariable Long patientId) {
        return prescriptionRepository.findByPatientId(patientId);
    }

    // POST - doctor creates prescription + QR code generated automatically
    @PostMapping
    public Prescription createPrescription(
            @RequestBody Prescription prescription) {

        // First save to get an ID assigned
        Prescription saved = prescriptionRepository.save(prescription);

        // Build the data that goes inside the QR code
        String qrData = qrCodeService.buildPrescriptionData(
                saved.getId(),
                saved.getPatientId(),
                saved.getDoctorId(),
                "See prescription #" + saved.getId()
        );

        // Generate the actual QR code image (as Base64 text)
        String qrCodeBase64 = qrCodeService.generateQRCode(qrData);

        // Save the QR code and set issued time
        saved.setQrCodeData(qrCodeBase64);
        saved.setStatus("ACTIVE");
        saved.setIssuedAt(LocalDateTime.now());

        return prescriptionRepository.save(saved);
    }

    // PUT - update prescription status
    @PutMapping("/{id}")
    public ResponseEntity<Prescription> updatePrescription(
            @PathVariable Long id,
            @RequestBody Prescription updated) {
        return prescriptionRepository.findById(id)
                .map(existing -> {
                    existing.setStatus(updated.getStatus());
                    return ResponseEntity.ok(
                            prescriptionRepository.save(existing));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}