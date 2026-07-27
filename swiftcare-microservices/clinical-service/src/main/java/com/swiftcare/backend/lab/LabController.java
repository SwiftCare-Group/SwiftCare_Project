package com.swiftcare.backend.lab;

import com.swiftcare.backend.lab.dto.LabOrderRequest;
import com.swiftcare.backend.lab.dto.LabOrderResponse;
import com.swiftcare.backend.lab.dto.LabResultRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/lab-orders")
@RequiredArgsConstructor
public class LabController {

    private final LabService labService;

    /**
     * Doctor creates a laboratory test order
     * for one of their consultations.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public LabOrderResponse createOrder(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody LabOrderRequest request
    ) {
        return labService.createOrder(
                email,
                request
        );
    }

    /**
     * Returns laboratory orders belonging
     * to the authenticated doctor.
     */
    @GetMapping("/doctor/me")
    public List<LabOrderResponse> getDoctorOrders(
            @AuthenticationPrincipal String email
    ) {
        return labService.getDoctorOrders(email);
    }

    /**
     * Returns laboratory orders belonging
     * to the authenticated patient.
     */
    @GetMapping("/patient/me")
    public List<LabOrderResponse> getPatientOrders(
            @AuthenticationPrincipal String email
    ) {
        return labService.getPatientOrders(email);
    }

    /**
     * Returns all laboratory orders waiting
     * to be processed.
     */
    @GetMapping("/pending")
    public List<LabOrderResponse> getPendingOrders() {
        return labService.getPendingOrders();
    }

    /**
     * Returns one laboratory order.
     */
    @GetMapping("/{orderId}")
    public LabOrderResponse getOrder(
            @PathVariable UUID orderId
    ) {
        return labService.getOrder(orderId);
    }

    /**
     * Marks a laboratory order as in progress.
     */
    @PatchMapping("/{orderId}/start")
    public LabOrderResponse startOrder(
            @PathVariable UUID orderId
    ) {
        return labService.startOrder(orderId);
    }

    /**
     * Records the final result for a laboratory order.
     */
    @PatchMapping("/{orderId}/result")
    public LabOrderResponse recordResult(
            @PathVariable UUID orderId,
            @Valid @RequestBody LabResultRequest request
    ) {
        return labService.recordResult(
                orderId,
                request
        );
    }

    /**
     * Cancels an unfinished laboratory order.
     */
    @PatchMapping("/{orderId}/cancel")
    public LabOrderResponse cancelOrder(
            @PathVariable UUID orderId
    ) {
        return labService.cancelOrder(orderId);
    }
}