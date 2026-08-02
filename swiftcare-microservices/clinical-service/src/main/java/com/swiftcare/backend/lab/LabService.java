package com.swiftcare.backend.lab;

import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.consultation.Consultation;
import com.swiftcare.backend.consultation.ConsultationRepository;
import com.swiftcare.backend.lab.dto.LabOrderRequest;
import com.swiftcare.backend.lab.dto.LabOrderResponse;
import com.swiftcare.backend.lab.dto.LabResultRequest;
import com.swiftcare.backend.lab.dto.LabResultResponse;
import com.swiftcare.backend.patient.Patient;
import com.swiftcare.backend.patient.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LabService {

    private final LabOrderRepository labOrderRepository;
    private final LabResultRepository labResultRepository;
    private final ConsultationRepository consultationRepository;
    private final PatientRepository patientRepository;

    /**
     * Allows the doctor assigned to a consultation to order a lab test.
     */
    @Transactional
    public LabOrderResponse createOrder(
            String authenticatedDoctorEmail,
            LabOrderRequest request
    ) {
        validateEmail(
                authenticatedDoctorEmail,
                "Authenticated doctor email is unavailable"
        );

        if (request == null) {
            throw new IllegalArgumentException(
                    "Lab order request is required"
            );
        }

        if (request.getConsultationId() == null) {
            throw new IllegalArgumentException(
                    "Consultation ID is required"
            );
        }

        String testName = normalizeRequiredText(
                request.getTestName(),
                "Test name is required"
        );

        Consultation consultation = consultationRepository
                .findById(request.getConsultationId())
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Consultation not found"
                        )
                );

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

        /*
         * Prevent one doctor from creating lab orders for another
         * doctor's consultation.
         */
        if (!consultation.getDoctor()
                .getEmail()
                .equalsIgnoreCase(authenticatedDoctorEmail)) {

            throw new SecurityException(
                    "You are not authorised to order tests " +
                            "for this consultation"
            );
        }

        if (labOrderRepository
                .existsByConsultationIdAndTestNameIgnoreCase(
                        consultation.getId(),
                        testName
                )) {

            throw new IllegalStateException(
                    "This laboratory test has already been ordered " +
                            "for the consultation"
            );
        }

        LabOrder order = LabOrder.builder()
                .consultation(consultation)
                .patient(consultation.getPatient())
                .testName(testName)
                .clinicalReason(
                        normalizeOptionalText(
                                request.getClinicalReason()
                        )
                )
                .instructions(
                        normalizeOptionalText(
                                request.getInstructions()
                        )
                )
                .status(LabStatus.ORDERED)
                .build();

        LabOrder savedOrder =
                labOrderRepository.save(order);

        return mapToOrderResponse(savedOrder);
    }

    /**
     * Returns all lab orders assigned to the authenticated doctor.
     */
    @Transactional(readOnly = true)
    public List<LabOrderResponse> getDoctorOrders(
            String authenticatedDoctorEmail
    ) {
        validateEmail(
                authenticatedDoctorEmail,
                "Authenticated doctor email is unavailable"
        );

        return labOrderRepository
                .findAllByConsultationDoctorEmailOrderByOrderedAtDesc(
                        authenticatedDoctorEmail
                )
                .stream()
                .map(this::mapToOrderResponse)
                .toList();
    }

    /**
     * Returns all lab orders belonging to the authenticated patient.
     */
    @Transactional(readOnly = true)
    public List<LabOrderResponse> getPatientOrders(
            String authenticatedPatientEmail
    ) {
        validateEmail(
                authenticatedPatientEmail,
                "Authenticated patient email is unavailable"
        );

        Patient patient = patientRepository
                .findByEmailIgnoreCaseAndIsDeletedFalse(
                        authenticatedPatientEmail.trim()
                )
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Authenticated patient not found"
                        )
                );

        return labOrderRepository
                .findAllByPatientIdOrderByOrderedAtDesc(
                        patient.getId()
                )
                .stream()
                .map(this::mapToOrderResponse)
                .toList();
    }

    /**
     * Returns pending laboratory orders from oldest to newest.
     */
    @Transactional(readOnly = true)
    public List<LabOrderResponse> getPendingOrders() {
        return labOrderRepository
                .findAllByStatusInOrderByOrderedAtAsc(
                        List.of(
                                LabStatus.ORDERED,
                                LabStatus.IN_PROGRESS
                        )
                )
                .stream()
                .map(this::mapToOrderResponse)
                .toList();
    }

    /**
     * Marks an order as being processed.
     */
    @Transactional
    public LabOrderResponse startOrder(
            UUID orderId
    ) {
        LabOrder order = findOrderByIdForUpdate(orderId);

        if (order.getStatus() == LabStatus.COMPLETED) {
            throw new IllegalStateException(
                    "A completed laboratory order cannot be restarted"
            );
        }

        if (order.getStatus() == LabStatus.CANCELLED) {
            throw new IllegalStateException(
                    "A cancelled laboratory order cannot be started"
            );
        }

        order.setStatus(LabStatus.IN_PROGRESS);

        return mapToOrderResponse(
                labOrderRepository.save(order)
        );
    }

    /**
     * Records the final result for a laboratory order.
     */
    @Transactional
    public LabOrderResponse recordResult(
            UUID orderId,
            LabResultRequest request,
            String authenticatedStaffName
    ) {
        if (request == null) {
            throw new IllegalArgumentException(
                    "Lab result request is required"
            );
        }

        LabOrder order = findOrderByIdForUpdate(orderId);

        if (order.getStatus() == LabStatus.CANCELLED) {
            throw new IllegalStateException(
                    "A result cannot be recorded for a cancelled order"
            );
        }

        if (labResultRepository.existsByLabOrderId(orderId)) {
            throw new IllegalStateException(
                    "A result has already been recorded " +
                            "for this laboratory order"
            );
        }

        String resultText = normalizeRequiredText(
                request.getResult(),
                "Result is required"
        );

        String performedBy = normalizeRequiredText(
                authenticatedStaffName,
                "Authenticated staff name is unavailable"
        );

        LabResult result = LabResult.builder()
                .labOrder(order)
                .result(resultText)
                .interpretation(
                        normalizeOptionalText(
                                request.getInterpretation()
                        )
                )
                .notes(
                        normalizeOptionalText(
                                request.getNotes()
                        )
                )
                .performedBy(performedBy)
                .performedAt(LocalDateTime.now())
                .build();

        labResultRepository.save(result);

        order.setStatus(LabStatus.COMPLETED);

        LabOrder savedOrder =
                labOrderRepository.save(order);

        return mapToOrderResponse(savedOrder);
    }

    /**
     * Returns one laboratory order.
     */
    @Transactional(readOnly = true)
    public LabOrderResponse getOrder(
            UUID orderId
    ) {
        return mapToOrderResponse(
                findOrderById(orderId)
        );
    }

    /**
     * Cancels an unfinished laboratory order.
     */
    @Transactional
    public LabOrderResponse cancelOrder(
            UUID orderId
    ) {
        LabOrder order = findOrderByIdForUpdate(orderId);

        if (order.getStatus() == LabStatus.COMPLETED) {
            throw new IllegalStateException(
                    "A completed laboratory order cannot be cancelled"
            );
        }

        order.setStatus(LabStatus.CANCELLED);

        return mapToOrderResponse(
                labOrderRepository.save(order)
        );
    }

    private LabOrder findOrderByIdForUpdate(
            UUID orderId
    ) {
        if (orderId == null) {
            throw new IllegalArgumentException(
                    "Lab order ID is required"
            );
        }

        return labOrderRepository
                .findForUpdateById(orderId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Laboratory order not found"
                        )
                );
    }

    private LabOrder findOrderById(
            UUID orderId
    ) {
        if (orderId == null) {
            throw new IllegalArgumentException(
                    "Lab order ID is required"
            );
        }

        return labOrderRepository
                .findById(orderId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Laboratory order not found"
                        )
                );
    }

    private LabOrderResponse mapToOrderResponse(
            LabOrder order
    ) {
        Consultation consultation =
                order.getConsultation();

        LabResultResponse resultResponse =
                labResultRepository
                        .findByLabOrderId(order.getId())
                        .map(this::mapToResultResponse)
                        .orElse(null);

        return LabOrderResponse.builder()
                .id(order.getId())
                .consultationId(
                        consultation.getId()
                )
                .patientId(
                        order.getPatient().getId()
                )
                .patientName(
                        order.getPatient().getName()
                )
                .doctorId(
                        consultation.getDoctor().getId()
                )
                .doctorName(
                        consultation.getDoctor().getName()
                )
                .testName(order.getTestName())
                .clinicalReason(
                        order.getClinicalReason()
                )
                .instructions(
                        order.getInstructions()
                )
                .status(order.getStatus())
                .orderedAt(order.getOrderedAt())
                .updatedAt(order.getUpdatedAt())
                .result(resultResponse)
                .build();
    }

    private LabResultResponse mapToResultResponse(
            LabResult result
    ) {
        return LabResultResponse.builder()
                .id(result.getId())
                .labOrderId(
                        result.getLabOrder().getId()
                )
                .result(result.getResult())
                .interpretation(
                        result.getInterpretation()
                )
                .notes(result.getNotes())
                .performedBy(
                        result.getPerformedBy()
                )
                .performedAt(
                        result.getPerformedAt()
                )
                .build();
    }

    private String normalizeRequiredText(
            String value,
            String errorMessage
    ) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(
                    errorMessage
            );
        }

        return value.trim();
    }

    private String normalizeOptionalText(
            String value
    ) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();

        return normalized.isBlank()
                ? null
                : normalized;
    }

    private void validateEmail(
            String email,
            String errorMessage
    ) {
        if (email == null || email.isBlank()) {
            throw new IllegalStateException(
                    errorMessage
            );
        }
    }
}