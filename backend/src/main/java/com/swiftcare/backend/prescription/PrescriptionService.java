package com.swiftcare.backend.prescription;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.swiftcare.backend.common.enums.DispensationStatus;
import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.consultation.Consultation;
import com.swiftcare.backend.consultation.ConsultationRepository;
import com.swiftcare.backend.pharmacy.DispensationRecord;
import com.swiftcare.backend.pharmacy.DispensationRecordRepository;
import com.swiftcare.backend.pharmacy.dto.DispenseRequest;
import com.swiftcare.backend.prescription.dto.PrescriptionRequest;
import com.swiftcare.backend.prescription.dto.PrescriptionResponse;
import com.swiftcare.backend.pharmacy.dto.DispensationRecordResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final ConsultationRepository consultationRepository;
    private final DispensationRecordRepository dispensationRecordRepository;

    @Transactional
    public PrescriptionResponse issuePrescription(PrescriptionRequest request) throws Exception {
        Consultation consultation = consultationRepository.findById(request.getConsultationId())
                .orElseThrow(() -> new ResourceNotFoundException("Consultation not found"));

        String qrData = buildQrData(consultation.getId(), request.getDrugs());
        String qrHash = hashQrData(qrData);
        String qrCodeBase64 = generateQrCodeBase64(qrData);

        Prescription prescription = Prescription.builder()
                .consultation(consultation)
                .doctor(consultation.getDoctor())
                .patient(consultation.getPatient())
                .drugs(request.getDrugs())
                .qrCodeData(qrCodeBase64)
                .qrCodeHash(qrHash)
                .build();

        Prescription saved = prescriptionRepository.save(prescription);

        // create pending dispensation records for each drug
        for (String drug : request.getDrugs()) {
            DispensationRecord record = DispensationRecord.builder()
                    .prescription(saved)
                    .drugName(drug)
                    .build();
            dispensationRecordRepository.save(record);
        }

        return mapToResponse(saved);
    }

    public PrescriptionResponse getPrescription(UUID prescriptionId) {
        Prescription prescription = prescriptionRepository.findById(prescriptionId)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription not found"));
        return mapToResponse(prescription);
    }

    public String getQrCode(UUID prescriptionId) {
        Prescription prescription = prescriptionRepository.findById(prescriptionId)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription not found"));
        return prescription.getQrCodeData();
    }

    @Transactional
    public DispensationRecordResponse dispense(UUID prescriptionId, DispenseRequest request) {
        Prescription prescription = prescriptionRepository.findById(prescriptionId)
                .orElseThrow(() -> new ResourceNotFoundException("Prescription not found"));

        DispensationRecord record = dispensationRecordRepository
                .findAllByPrescriptionId(prescriptionId)
                .stream()
                .filter(r -> r.getDrugName().equalsIgnoreCase(request.getDrugName()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Drug not found in prescription"));

        record.setStatus(request.getStatus());
        record.setPharmacyName(request.getPharmacyName());

        if (request.getStatus() == DispensationStatus.DISPENSED) {
            record.setDispensedAt(LocalDateTime.now());
        }

        return mapToDispensationResponse(dispensationRecordRepository.save(record));
    }

    public List<DispensationRecordResponse> getRemainingDrugs(UUID prescriptionId) {
        return dispensationRecordRepository
                .findAllByPrescriptionIdAndStatus(prescriptionId, DispensationStatus.PENDING)
                .stream()
                .map(this::mapToDispensationResponse)
                .collect(Collectors.toList());
    }

    private DispensationRecordResponse mapToDispensationResponse(DispensationRecord record) {
        return DispensationRecordResponse.builder()
                .id(record.getId())
                .prescriptionId(record.getPrescription().getId())
                .drugName(record.getDrugName())
                .status(record.getStatus())
                .pharmacyName(record.getPharmacyName())
                .dispensedAt(record.getDispensedAt())
                .build();
    }

    private String buildQrData(UUID consultationId, List<String> drugs) {
        return String.format("SWIFTCARE|%s|%s|%s",
                consultationId,
                String.join(",", drugs),
                UUID.randomUUID());
    }

    private String hashQrData(String data) throws NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(data.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(hash);
    }

    private String generateQrCodeBase64(String data) throws WriterException, IOException {
        QRCodeWriter qrCodeWriter = new QRCodeWriter();
        BitMatrix bitMatrix = qrCodeWriter.encode(data, BarcodeFormat.QR_CODE, 300, 300);

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);

        return Base64.getEncoder().encodeToString(outputStream.toByteArray());
    }

    private PrescriptionResponse mapToResponse(Prescription prescription) {
        return PrescriptionResponse.builder()
                .id(prescription.getId())
                .consultationId(prescription.getConsultation().getId())
                .patientId(prescription.getPatient().getId())
                .doctorId(prescription.getDoctor().getId())
                .drugs(prescription.getDrugs())
                .qrCodeData(prescription.getQrCodeData())
                .issuedAt(prescription.getIssuedAt())
                .build();
    }

    public List<PrescriptionResponse> getPatientPrescriptions(UUID patientId) {
        return prescriptionRepository.findAllByPatientId(patientId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
}