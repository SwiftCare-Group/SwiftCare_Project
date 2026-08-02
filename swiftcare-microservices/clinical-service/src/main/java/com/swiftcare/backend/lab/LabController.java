package com.swiftcare.backend.lab;

import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.consultation.DoctorRepository;
import com.swiftcare.backend.lab.dto.LabOrderRequest;
import com.swiftcare.backend.lab.dto.LabOrderResponse;
import com.swiftcare.backend.lab.dto.LabResultRequest;
import com.swiftcare.backend.patient.PatientRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/lab-orders")
@RequiredArgsConstructor
public class LabController {

    private final LabService labService;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LabOrderResponse createOrder(
            Authentication authentication,
            @Valid @RequestBody LabOrderRequest request
    ) {
        return labService.createOrder(
                authenticatedEmail(authentication),
                request
        );
    }

    @GetMapping("/doctor/me")
    public List<LabOrderResponse> getDoctorOrders(
            Authentication authentication
    ) {
        return labService.getDoctorOrders(
                authenticatedEmail(authentication)
        );
    }

    @GetMapping("/patient/me")
    public List<LabOrderResponse> getPatientOrders(
            Authentication authentication
    ) {
        return labService.getPatientOrders(
                authenticatedEmail(authentication)
        );
    }

    @GetMapping("/pending")
    public List<LabOrderResponse> getPendingOrders() {
        return labService.getPendingOrders();
    }

    @GetMapping("/{orderId}")
    public LabOrderResponse getOrder(
            @PathVariable UUID orderId,
            Authentication authentication
    ) {
        LabOrderResponse response = labService.getOrder(orderId);
        ensureCanRead(response, authentication);
        return response;
    }

    @PatchMapping("/{orderId}/start")
    public LabOrderResponse startOrder(
            @PathVariable UUID orderId
    ) {
        return labService.startOrder(orderId);
    }

    @PatchMapping("/{orderId}/result")
    public LabOrderResponse recordResult(
            @PathVariable UUID orderId,
            @Valid @RequestBody LabResultRequest request,
            Authentication authentication
    ) {
        String performedBy = doctorRepository
                .findByEmailIgnoreCaseAndIsDeletedFalse(
                        authenticatedEmail(authentication)
                )
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Authenticated staff account not found"
                ))
                .getName();

        return labService.recordResult(
                orderId,
                request,
                performedBy
        );
    }

    @PatchMapping("/{orderId}/cancel")
    public LabOrderResponse cancelOrder(
            @PathVariable UUID orderId,
            Authentication authentication
    ) {
        LabOrderResponse current = labService.getOrder(orderId);

        if (!hasRole(authentication, "ADMIN")
                && !authenticatedDoctorId(authentication)
                .equals(current.getDoctorId())) {
            throw new SecurityException(
                    "Only the ordering doctor can cancel this laboratory order"
            );
        }

        return labService.cancelOrder(orderId);
    }

    private void ensureCanRead(
            LabOrderResponse order,
            Authentication authentication
    ) {
        if (hasAnyRole(authentication, "ADMIN", "LAB_TECHNICIAN")) {
            return;
        }

        if (hasRole(authentication, "PATIENT")) {
            if (!authenticatedPatientId(authentication).equals(order.getPatientId())) {
                throw new SecurityException(
                        "You cannot access another patient's laboratory order"
                );
            }
            return;
        }

        if (hasRole(authentication, "DOCTOR")
                && authenticatedDoctorId(authentication).equals(order.getDoctorId())) {
            return;
        }

        throw new SecurityException(
                "You do not have permission to access this laboratory order"
        );
    }

    private UUID authenticatedPatientId(Authentication authentication) {
        return patientRepository
                .findByEmailIgnoreCaseAndIsDeletedFalse(
                        authenticatedEmail(authentication)
                )
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Authenticated patient account not found"
                ))
                .getId();
    }

    private UUID authenticatedDoctorId(Authentication authentication) {
        return doctorRepository
                .findByEmailIgnoreCaseAndIsDeletedFalse(
                        authenticatedEmail(authentication)
                )
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Authenticated doctor account not found"
                ))
                .getId();
    }

    private String authenticatedEmail(Authentication authentication) {
        if (authentication == null
                || authentication.getName() == null
                || authentication.getName().isBlank()) {
            throw new IllegalStateException(
                    "Authenticated user email is unavailable"
            );
        }

        return authentication.getName().trim();
    }

    private boolean hasRole(Authentication authentication, String role) {
        return authentication != null
                && authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_" + role));
    }

    private boolean hasAnyRole(
            Authentication authentication,
            String... roles
    ) {
        for (String role : roles) {
            if (hasRole(authentication, role)) {
                return true;
            }
        }
        return false;
    }
}
