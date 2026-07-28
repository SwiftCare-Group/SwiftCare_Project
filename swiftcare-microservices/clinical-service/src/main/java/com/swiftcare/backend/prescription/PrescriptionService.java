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
import com.swiftcare.backend.consultation.Doctor;
import com.swiftcare.backend.consultation.DoctorRepository;
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
import java.util.ArrayList;
import java.util.Base64;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final ConsultationRepository consultationRepository;
    private final DoctorRepository doctorRepository;
    private final DispensationRecordRepository dispensationRecordRepository;

    /**
     * Issues one prescription for a completed consultation.
     */
    @Transactional
    public PrescriptionResponse issuePrescription(
            PrescriptionRequest request,
            String authenticatedDoctorEmail
    ) {
        if (request == null) {
            throw new IllegalArgumentException(
                    "Prescription request is required"
            );
        }

        if (request.getConsultationId() == null) {
            throw new IllegalArgumentException(
                    "Consultation ID is required"
            );
        }

        Consultation consultation = consultationRepository
                .findById(request.getConsultationId())
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Consultation not found"
                        )
                );

        Doctor authenticatedDoctor = doctorRepository
                .findByEmailIgnoreCaseAndIsDeletedFalse(
                        authenticatedDoctorEmail == null
                                ? ""
                                : authenticatedDoctorEmail.trim()
                )
                .orElseThrow(() -> new SecurityException(
                        "Authenticated doctor account was not found"
                ));

        if (consultation.getDoctor() == null
                || !authenticatedDoctor.getId().equals(
                        consultation.getDoctor().getId()
                )) {
            throw new SecurityException(
                    "Only the assigned doctor can issue this prescription"
            );
        }

        if (prescriptionRepository.existsByConsultationId(
                consultation.getId()
        )) {
            throw new IllegalStateException(
                    "A prescription has already been issued " +
                            "for this consultation"
            );
        }

        if (consultation.getDoctor() == null) {
            throw new IllegalStateException(
                    "The consultation does not have an assigned doctor"
            );
        }

        if (consultation.getPatient() == null) {
            throw new IllegalStateException(
                    "The consultation does not have an assigned patient"
            );
        }

        List<String> drugs = sanitizeDrugs(request.getDrugs());

        String qrPayload = buildQrData(
                consultation.getId(),
                drugs
        );

        String qrHash = hashQrData(qrPayload);
        String qrCodeBase64 = generateQrCodeBase64(qrPayload);

        Prescription prescription = Prescription.builder()
                .consultation(consultation)
                .doctor(consultation.getDoctor())
                .patient(consultation.getPatient())
                .drugs(new ArrayList<>(drugs))
                .qrCodeData(qrCodeBase64)
                .qrCodeHash(qrHash)
                .build();

        Prescription savedPrescription =
                prescriptionRepository.save(prescription);

        createDispensationRecords(
                savedPrescription,
                drugs
        );

        log.info(
                "Prescription {} issued for consultation {} " +
                        "and patient {}",
                savedPrescription.getId(),
                consultation.getId(),
                consultation.getPatient().getId()
        );

        return mapToResponse(savedPrescription);
    }

    /**
     * Returns a prescription by its ID.
     */
    @Transactional(readOnly = true)
    public PrescriptionResponse getPrescription(
            UUID prescriptionId
    ) {
        Prescription prescription =
                findPrescriptionById(prescriptionId);

        return mapToResponse(prescription);
    }

    /**
     * Returns the Base64-encoded PNG QR code.
     */
    @Transactional(readOnly = true)
    public String getQrCode(
            UUID prescriptionId
    ) {
        Prescription prescription =
                findPrescriptionById(prescriptionId);

        return prescription.getQrCodeData();
    }

    /**
     * Updates the dispensation status of one drug.
     */
    @Transactional
    public DispensationRecordResponse dispense(
            UUID prescriptionId,
            DispenseRequest request,
            String authenticatedPharmacistEmail
    ) {
        if (prescriptionId == null) {
            throw new IllegalArgumentException("Prescription ID is required");
        }
        if (request == null) {
            throw new IllegalArgumentException("Dispensation request is required");
        }

        findPrescriptionById(prescriptionId);
        Doctor pharmacist = doctorRepository
                .findByEmailIgnoreCaseAndIsDeletedFalse(
                        authenticatedPharmacistEmail == null
                                ? ""
                                : authenticatedPharmacistEmail.trim()
                )
                .filter(staff -> staff.getRole() == com.swiftcare.backend.common.enums.Role.PHARMACIST)
                .orElseThrow(() -> new SecurityException(
                        "Authenticated pharmacist account was not found"
                ));

        String drugName = validateAndNormalizeDrugName(request.getDrugName());
        DispensationStatus requestedStatus = request.getStatus();
        if (requestedStatus != DispensationStatus.DISPENSED
                && requestedStatus != DispensationStatus.UNAVAILABLE) {
            throw new IllegalArgumentException(
                    "Medication can only be marked as dispensed or unavailable"
            );
        }

        DispensationRecord record = dispensationRecordRepository
                .findByPrescriptionIdAndDrugNameIgnoreCase(prescriptionId, drugName)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Drug not found in prescription"
                ));

        if (record.getStatus() != DispensationStatus.PENDING) {
            if (record.getStatus() == requestedStatus) {
                return mapToDispensationResponse(record);
            }
            throw new IllegalStateException(
                    "This medication has already received a final dispensation status"
            );
        }

        String pharmacyName = request.getPharmacyName() == null
                ? ""
                : request.getPharmacyName().trim();
        if (pharmacyName.isBlank()) {
            throw new IllegalArgumentException("Pharmacy name is required");
        }

        LocalDateTime now = LocalDateTime.now();
        record.setStatus(requestedStatus);
        record.setPharmacyName(pharmacyName);
        record.setPharmacistId(pharmacist.getId());
        record.setPharmacistName(pharmacist.getName());
        record.setQuantityDispensed(cleanOptionalText(request.getQuantityDispensed()));
        record.setNotes(cleanOptionalText(request.getNotes()));
        record.setDispensedAt(now);

        DispensationRecord savedRecord = dispensationRecordRepository.save(record);
        log.info(
                "Prescription {} medication {} set to {} by pharmacist {}",
                prescriptionId,
                savedRecord.getDrugName(),
                savedRecord.getStatus(),
                pharmacist.getId()
        );
        return mapToDispensationResponse(savedRecord);
    }

    @Transactional(readOnly = true)
    public PrescriptionResponse lookupByQrCode(String scannedCode) {
        if (scannedCode == null || scannedCode.isBlank()) {
            throw new IllegalArgumentException("Scanned QR data is required");
        }

        String normalized = scannedCode.trim();
        if (!normalized.startsWith("SWIFTCARE|")) {
            throw new IllegalArgumentException("This is not a valid SwiftCare prescription QR code");
        }

        Prescription prescription = prescriptionRepository
                .findByQrCodeHash(hashQrData(normalized))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Prescription was not found or the QR code is invalid"
                ));
        return mapToResponse(prescription);
    }

    @Transactional(readOnly = true)
    public List<DispensationRecordResponse> getDispensationRecords(UUID prescriptionId) {
        findPrescriptionById(prescriptionId);
        return dispensationRecordRepository
                .findAllByPrescriptionId(prescriptionId)
                .stream()
                .map(this::mapToDispensationResponse)
                .toList();
    }

    /**
     * Returns drugs that have not yet been dispensed.
     */
    @Transactional(readOnly = true)
    public List<DispensationRecordResponse> getRemainingDrugs(
            UUID prescriptionId
    ) {
        if (prescriptionId == null) {
            throw new IllegalArgumentException(
                    "Prescription ID is required"
            );
        }

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

    /**
     * Returns a patient's prescriptions from newest to oldest.
     */
    @Transactional(readOnly = true)
    public List<PrescriptionResponse> getPatientPrescriptions(
            UUID patientId
    ) {
        if (patientId == null) {
            throw new IllegalArgumentException(
                    "Patient ID is required"
            );
        }

        return prescriptionRepository
                .findAllByPatientIdOrderByIssuedAtDesc(patientId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    /**
     * Creates one pending dispensation record for every drug.
     */
    private void createDispensationRecords(
            Prescription prescription,
            List<String> drugs
    ) {
        List<DispensationRecord> records = drugs.stream()
                .map(drug ->
                        DispensationRecord.builder()
                                .prescription(prescription)
                                .drugName(drug)
                                .status(
                                        DispensationStatus.PENDING
                                )
                                .build()
                )
                .toList();

        dispensationRecordRepository.saveAll(records);
    }

    /**
     * Removes null, blank and duplicate drugs.
     * Duplicate checking is case-insensitive while preserving order.
     */
    private List<String> sanitizeDrugs(
            List<String> requestedDrugs
    ) {
        if (requestedDrugs == null
                || requestedDrugs.isEmpty()) {
            throw new IllegalArgumentException(
                    "At least one drug must be included " +
                            "in the prescription"
            );
        }

        Map<String, String> uniqueDrugs =
                new LinkedHashMap<>();

        for (String drug : requestedDrugs) {
            if (drug == null || drug.isBlank()) {
                continue;
            }

            String trimmedDrug = drug.trim();
            String normalizedKey =
                    trimmedDrug.toLowerCase();

            uniqueDrugs.putIfAbsent(
                    normalizedKey,
                    trimmedDrug
            );
        }

        List<String> drugs =
                new ArrayList<>(uniqueDrugs.values());

        if (drugs.isEmpty()) {
            throw new IllegalArgumentException(
                    "At least one valid drug must be included " +
                            "in the prescription"
            );
        }

        return drugs;
    }

    private String cleanOptionalText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String validateAndNormalizeDrugName(
            String drugName
    ) {
        if (drugName == null || drugName.isBlank()) {
            throw new IllegalArgumentException(
                    "Drug name is required"
            );
        }

        return drugName.trim();
    }

    private Prescription findPrescriptionById(
            UUID prescriptionId
    ) {
        if (prescriptionId == null) {
            throw new IllegalArgumentException(
                    "Prescription ID is required"
            );
        }

        return prescriptionRepository
                .findById(prescriptionId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Prescription not found"
                        )
                );
    }

    private DispensationRecordResponse
    mapToDispensationResponse(
            DispensationRecord record
    ) {
        return DispensationRecordResponse.builder()
                .id(record.getId())
                .prescriptionId(
                        record.getPrescription().getId()
                )
                .drugName(record.getDrugName())
                .status(record.getStatus())
                .pharmacyName(record.getPharmacyName())
                .pharmacistId(record.getPharmacistId())
                .pharmacistName(record.getPharmacistName())
                .quantityDispensed(record.getQuantityDispensed())
                .notes(record.getNotes())
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
            .drugs(
                    List.copyOf(
                            prescription.getDrugs()
                    )
            )
            .drugCount(
                    prescription.getDrugs().size()
            )
            .qrCodeData(
                    prescription.getQrCodeData()
            )
            .dispensationRecords(
                    dispensationRecordRepository
                            .findAllByPrescriptionId(prescription.getId())
                            .stream()
                            .map(this::mapToDispensationResponse)
                            .toList()
            )
            .issuedAt(
                    prescription.getIssuedAt()
            )
            .build();
}
    /**
     * Creates the data embedded inside the QR code.
     */
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

    /**
     * Produces a SHA-256 hash of the QR payload.
     */
    private String hashQrData(
            String data
    ) {
        try {
            MessageDigest digest =
                    MessageDigest.getInstance("SHA-256");

            byte[] hash = digest.digest(
                    data.getBytes(StandardCharsets.UTF_8)
            );

            return HexFormat.of().formatHex(hash);

        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(
                    "SHA-256 hashing is not available",
                    exception
            );
        }
    }

    /**
     * Generates a 300x300 PNG QR code and converts it to Base64.
     */
    private String generateQrCodeBase64(
            String data
    ) {
        try {
            QRCodeWriter qrCodeWriter =
                    new QRCodeWriter();

            BitMatrix bitMatrix =
                    qrCodeWriter.encode(
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
                        .encodeToString(
                                outputStream.toByteArray()
                        );
            }

        } catch (WriterException | IOException exception) {
            throw new IllegalStateException(
                    "Failed to generate prescription QR code",
                    exception
            );
        }
    }
}