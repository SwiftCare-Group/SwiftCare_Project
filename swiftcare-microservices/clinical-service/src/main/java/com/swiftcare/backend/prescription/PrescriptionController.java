package com.swiftcare.backend.prescription;

import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.patient.Patient;
import com.swiftcare.backend.patient.PatientRepository;
import com.swiftcare.backend.pharmacy.dto.DispensationRecordResponse;
import com.swiftcare.backend.pharmacy.dto.DispenseRequest;
import com.swiftcare.backend.prescription.dto.PrescriptionRequest;
import com.swiftcare.backend.prescription.dto.PrescriptionResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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

    /**
     * Issues a prescription for a consultation.
     * Restricted to authenticated doctors by SecurityConfig.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PrescriptionResponse issuePrescription(
            @Valid @RequestBody PrescriptionRequest request
    ) {
        return prescriptionService.issuePrescription(request);
    }

    /**
     * Returns prescriptions belonging to the authenticated patient.
     */
    @GetMapping("/my")
    public List<PrescriptionResponse> getMyPrescriptions(
            @AuthenticationPrincipal String email
    ) {
        if (email == null || email.isBlank()) {
            throw new IllegalStateException(
                    "Authenticated patient email is unavailable"
            );
        }

        Patient patient = patientRepository
                .findByEmail(email)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Authenticated patient not found"
                        )
                );

        return prescriptionService.getPatientPrescriptions(
                patient.getId()
        );
    }

    /**
     * Returns one prescription by its ID.
     */
    @GetMapping("/{prescriptionId}")
    public PrescriptionResponse getPrescription(
            @PathVariable UUID prescriptionId
    ) {
        return prescriptionService.getPrescription(
                prescriptionId
        );
    }

    /**
     * Returns the Base64-encoded QR image for a prescription.
     */
    @GetMapping("/{prescriptionId}/qr")
    public Map<String, String> getQrCode(
            @PathVariable UUID prescriptionId
    ) {
        String qrCode = prescriptionService.getQrCode(
                prescriptionId
        );

        return Map.of(
                "prescriptionId",
                prescriptionId.toString(),
                "qrCode",
                qrCode
        );
    }

    /**
     * Updates the dispensation status of one prescribed drug.
     * Restricted to pharmacists by SecurityConfig.
     */
    @PatchMapping("/{prescriptionId}/dispense")
    public DispensationRecordResponse dispenseDrug(
            @PathVariable UUID prescriptionId,
            @Valid @RequestBody DispenseRequest request
    ) {
        return prescriptionService.dispense(
                prescriptionId,
                request
        );
    }

    /**
     * Returns all drugs that have not yet been dispensed.
     */
    @GetMapping("/{prescriptionId}/remaining")
    public List<DispensationRecordResponse> getRemainingDrugs(
            @PathVariable UUID prescriptionId
    ) {
        return prescriptionService.getRemainingDrugs(
                prescriptionId
        );
    }
}