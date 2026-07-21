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
import com.swiftcare.backend.pharmacy.dto.DispensationRecordResponse;
import com.swiftcare.backend.pharmacy.dto.DispenseRequest;
import com.swiftcare.backend.prescription.dto.PrescriptionRequest;
import com.swiftcare.backend.prescription.dto.PrescriptionResponse;
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

@Service
@RequiredArgsConstructor
@Slf4j
public class PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final ConsultationRepository consultationRepository;
    private final DispensationRecordRepository dispensationRecordRepository;

    @Transactional
    public PrescriptionResponse issuePrescription(
            PrescriptionRequest request
    ) throws WriterException, IOException, NoSuchAlgorithmException {

        Consultation consultation = consultationRepository
                .findById(request.getConsultationId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Consultation not found")
                );

        if (prescriptionRepository.existsByConsultationId(consultation.getId())) {
            throw new IllegalStateException(
                    "A prescription has already been issued for this consultation"
            );
        }

        if (request.getDrugs() == null || request.getDrugs().isEmpty()) {
            throw new IllegalArgumentException(
                    "At least one drug must be included in the prescription"
            );
        }

        List<String> drugs = request.getDrugs()
                .stream()
                .filter(drug -> drug != null && !drug.isBlank())
                .map(String::trim)
                .distinct()
                .toList();

        if (drugs.isEmpty()) {
            throw new IllegalArgumentException(
                    "At least one valid drug must be included in the prescription"
            );
        }

        String qrData = buildQrData(consultation.getId(), drugs);
        String qrHash = hashQrData(qrData);
        String qrCodeBase64 = generateQrCodeBase64(qrData);

        Prescription prescription = Prescription.builder()
                .consultation(consultation)
                .doctor(consultation.getDoctor())
                .patient(consultation.getPatient())
                .drugs(drugs)
                .qrCodeData(qrCodeBase64)
                .qrCodeHash(qrHash)
                .build();

        Prescription savedPrescription =
                prescriptionRepository.save(prescription);

        for (String drug : drugs) {
            DispensationRecord record = DispensationRecord.builder()
                    .prescription(savedPrescription)
                    .drugName(drug)
                    .status(DispensationStatus.PENDING)
                    .build();

            dispensationRecordRepository.save(record);
        }

        log.info(
                "Prescription {} issued for consultation {}",
                savedPrescription.getId(),
                consultation.getId()
        );

        return mapToResponse(savedPrescription);
    }

    @Transactional(readOnly = true)
    public PrescriptionResponse getPrescription(UUID prescriptionId) {
        Prescription prescription = prescriptionRepository
                .findById(prescriptionId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Prescription not found")
                );

        return mapToResponse(prescription);
    }

    @Transactional(readOnly = true)
    public String getQrCode(UUID prescriptionId) {
        Prescription prescription = prescriptionRepository
                .findById(prescriptionId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Prescription not found")
                );

        return prescription.getQrCodeData();
    }

    @Transactional
    public DispensationRecordResponse dispense(
            UUID prescriptionId,
            DispenseRequest request
    ) {
        prescriptionRepository.findById(prescriptionId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Prescription not found")
                );

        if (request.getDrugName() == null
                || request.getDrugName().isBlank()) {
            throw new IllegalArgumentException("Drug name is required");
        }

        if (request.getStatus() == null) {
            throw new IllegalArgumentException(
                    "Dispensation status is required"
            );
        }

        DispensationRecord record = dispensationRecordRepository
                .findAllByPrescriptionId(prescriptionId)
                .stream()
                .filter(existingRecord ->
                        existingRecord.getDrugName()
                                .equalsIgnoreCase(
                                        request.getDrugName().trim()
                                )
                )
                .findFirst()
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Drug not found in prescription"
                        )
                );

        record.setStatus(request.getStatus());
        record.setPharmacyName(request.getPharmacyName());

        if (request.getStatus() == DispensationStatus.DISPENSED) {
            record.setDispensedAt(LocalDateTime.now());
        } else {
            record.setDispensedAt(null);
        }

        DispensationRecord savedRecord =
                dispensationRecordRepository.save(record);

        log.info(
                "Dispensation record {} updated to {}",
                savedRecord.getId(),
                savedRecord.getStatus()
        );

        return mapToDispensationResponse(savedRecord);
    }

    @Transactional(readOnly = true)
    public List<DispensationRecordResponse> getRemainingDrugs(
            UUID prescriptionId
    ) {
        if (!prescriptionRepository.existsById(prescriptionId)) {
            throw new ResourceNotFoundException(
                    "Prescription not found"
            );
        }

        return dispensationRecordRepository
                .findAllByPrescriptionIdAndStatus(
                        prescriptionId,
                        DispensationStatus.PENDING
                )
                .stream()
                .map(this::mapToDispensationResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PrescriptionResponse> getPatientPrescriptions(
            UUID patientId
    ) {
        return prescriptionRepository
                .findAllByPatientId(patientId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    private DispensationRecordResponse mapToDispensationResponse(
            DispensationRecord record
    ) {
        return DispensationRecordResponse.builder()
                .id(record.getId())
                .prescriptionId(record.getPrescription().getId())
                .drugName(record.getDrugName())
                .status(record.getStatus())
                .pharmacyName(record.getPharmacyName())
                .dispensedAt(record.getDispensedAt())
                .build();
    }

    private PrescriptionResponse mapToResponse(
            Prescription prescription
    ) {
        return PrescriptionResponse.builder()
                .id(prescription.getId())
                .consultationId(
                        prescription.getConsultation().getId()
                )
                .patientId(
                        prescription.getPatient().getId()
                )
                .doctorId(
                        prescription.getDoctor().getId()
                )
                .drugs(prescription.getDrugs())
                .qrCodeData(prescription.getQrCodeData())
                .issuedAt(prescription.getIssuedAt())
                .build();
    }

    private String buildQrData(
            UUID consultationId,
            List<String> drugs
    ) {
        return String.format(
                "SWIFTCARE|%s|%s|%s",
                consultationId,
                String.join(",", drugs),
                UUID.randomUUID()
        );
    }

    private String hashQrData(
            String data
    ) throws NoSuchAlgorithmException {
        MessageDigest digest =
                MessageDigest.getInstance("SHA-256");

        byte[] hash = digest.digest(
                data.getBytes(StandardCharsets.UTF_8)
        );

        return HexFormat.of().formatHex(hash);
    }

    private String generateQrCodeBase64(
            String data
    ) throws WriterException, IOException {
        QRCodeWriter qrCodeWriter = new QRCodeWriter();

        BitMatrix bitMatrix = qrCodeWriter.encode(
                data,
                BarcodeFormat.QR_CODE,
                300,
                300
        );

        try (ByteArrayOutputStream outputStream =
                     new ByteArrayOutputStream()) {

            MatrixToImageWriter.writeToStream(
                    bitMatrix,
                    "PNG",
                    outputStream
            );

            return Base64.getEncoder()
                    .encodeToString(outputStream.toByteArray());
        }
    }
}