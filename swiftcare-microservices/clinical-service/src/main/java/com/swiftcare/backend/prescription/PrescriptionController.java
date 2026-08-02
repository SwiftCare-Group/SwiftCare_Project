package com.swiftcare.backend.prescription;

import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.consultation.DoctorRepository;
import com.swiftcare.backend.patient.PatientRepository;
import com.swiftcare.backend.pharmacy.dto.DispensationRecordResponse;
import com.swiftcare.backend.pharmacy.dto.DispenseRequest;
import com.swiftcare.backend.prescription.dto.PrescriptionRequest;
import com.swiftcare.backend.prescription.dto.PrescriptionResponse;
import com.swiftcare.backend.prescription.dto.QrLookupRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
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
    private final DoctorRepository doctorRepository;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PrescriptionResponse issuePrescription(
            Authentication authentication,
            @Valid @RequestBody PrescriptionRequest request
    ) {
        return prescriptionService.issuePrescription(request, authenticatedEmail(authentication));
    }

    @PostMapping("/lookup")
    public PrescriptionResponse lookupPrescription(
            @Valid @RequestBody QrLookupRequest request
    ) {
        return prescriptionService.lookupByQrCode(request.getCode());
    }

    @GetMapping("/my")
    public List<PrescriptionResponse> getMyPrescriptions(Authentication authentication) {
        return prescriptionService.getPatientPrescriptions(authenticatedPatientId(authentication));
    }

    @GetMapping("/{prescriptionId}")
    public PrescriptionResponse getPrescription(
            @PathVariable UUID prescriptionId,
            Authentication authentication
    ) {
        PrescriptionResponse response = prescriptionService.getPrescription(prescriptionId);
        ensureCanRead(response, authentication);
        return response;
    }

    @GetMapping("/{prescriptionId}/qr")
    public Map<String, String> getQrCode(
            @PathVariable UUID prescriptionId,
            Authentication authentication
    ) {
        PrescriptionResponse response = prescriptionService.getPrescription(prescriptionId);
        ensureCanRead(response, authentication);
        return Map.of(
                "prescriptionId", prescriptionId.toString(),
                "qrCode", prescriptionService.getQrCode(prescriptionId)
        );
    }

    @PatchMapping("/{prescriptionId}/dispense")
    public DispensationRecordResponse dispenseDrug(
            @PathVariable UUID prescriptionId,
            @Valid @RequestBody DispenseRequest request,
            Authentication authentication
    ) {
        return prescriptionService.dispense(
                prescriptionId,
                request,
                authenticatedEmail(authentication)
        );
    }

    @GetMapping("/{prescriptionId}/remaining")
    public List<DispensationRecordResponse> getRemainingDrugs(
            @PathVariable UUID prescriptionId,
            Authentication authentication
    ) {
        PrescriptionResponse response = prescriptionService.getPrescription(prescriptionId);
        ensureCanRead(response, authentication);
        return prescriptionService.getRemainingDrugs(prescriptionId);
    }

    @GetMapping("/{prescriptionId}/dispensations")
    public List<DispensationRecordResponse> getDispensationRecords(
            @PathVariable UUID prescriptionId,
            Authentication authentication
    ) {
        PrescriptionResponse response = prescriptionService.getPrescription(prescriptionId);
        ensureCanRead(response, authentication);
        return prescriptionService.getDispensationRecords(prescriptionId);
    }

    private void ensureCanRead(PrescriptionResponse prescription, Authentication authentication) {
        if (hasAnyRole(authentication, "PHARMACIST", "ADMIN")) {
            return;
        }
        if (hasRole(authentication, "PATIENT")) {
            if (!authenticatedPatientId(authentication).equals(prescription.getPatientId())) {
                throw new SecurityException("You cannot access another patient's prescription");
            }
            return;
        }
        if (hasRole(authentication, "DOCTOR")
                && authenticatedDoctorId(authentication).equals(prescription.getDoctorId())) {
            return;
        }
        throw new SecurityException("You do not have permission to access this prescription");
    }

    private UUID authenticatedPatientId(Authentication authentication) {
        return patientRepository
                .findByEmailIgnoreCaseAndIsDeletedFalse(authenticatedEmail(authentication))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Authenticated patient account not found"
                ))
                .getId();
    }

    private UUID authenticatedDoctorId(Authentication authentication) {
        return doctorRepository
                .findByEmailIgnoreCaseAndIsDeletedFalse(authenticatedEmail(authentication))
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Authenticated doctor account not found"
                ))
                .getId();
    }

    private String authenticatedEmail(Authentication authentication) {
        if (authentication == null
                || authentication.getName() == null
                || authentication.getName().isBlank()) {
            throw new IllegalStateException("Authenticated user email is unavailable");
        }
        return authentication.getName().trim();
    }

    private boolean hasRole(Authentication authentication, String role) {
        return authentication != null
                && authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_" + role));
    }

    private boolean hasAnyRole(Authentication authentication, String... roles) {
        for (String role : roles) {
            if (hasRole(authentication, role)) {
                return true;
            }
        }
        return false;
    }
}
