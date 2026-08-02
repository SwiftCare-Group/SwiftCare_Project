package com.swiftcare.backend.consultation;

import com.swiftcare.backend.appointment.Appointment;
import com.swiftcare.backend.clinicalrecord.ClinicalRecordService;
import com.swiftcare.backend.clinicalrecord.dto.ClinicalRecordResponse;
import com.swiftcare.backend.clinicalrecord.dto.CreateClinicalRecordRequest;
import com.swiftcare.backend.common.enums.AppointmentStatus;
import com.swiftcare.backend.common.enums.ConsultationStatus;
import com.swiftcare.backend.common.enums.QueueStatus;
import com.swiftcare.backend.common.enums.Role;
import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.common.exception.UnauthorizedException;
import com.swiftcare.backend.consultation.dto.CompleteConsultationRequest;
import com.swiftcare.backend.consultation.dto.ConsultationCompletionResponse;
import com.swiftcare.backend.consultation.dto.LabOrderItemRequest;
import com.swiftcare.backend.lab.LabService;
import com.swiftcare.backend.lab.dto.LabOrderRequest;
import com.swiftcare.backend.lab.dto.LabOrderResponse;
import com.swiftcare.backend.patient.Patient;
import com.swiftcare.backend.prescription.PrescriptionService;
import com.swiftcare.backend.prescription.dto.PrescriptionRequest;
import com.swiftcare.backend.prescription.dto.PrescriptionResponse;
import com.swiftcare.backend.queue.QueueEntry;
import com.swiftcare.backend.queue.QueueEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ConsultationWorkflowService {

    private final ConsultationRepository consultationRepository;
    private final DoctorRepository doctorRepository;
    private final QueueEntryRepository queueEntryRepository;
    private final ClinicalRecordService clinicalRecordService;
    private final PrescriptionService prescriptionService;
    private final LabService labService;

    @Transactional
    public ConsultationCompletionResponse completeConsultation(
            String authenticatedDoctorEmail,
            CompleteConsultationRequest request
    ) {
        validateRequest(request);
        Doctor doctor = findDoctor(authenticatedDoctorEmail);

        QueueEntry queueEntry = null;
        List<QueueEntry> lockedQueueEntries = List.of();
        Appointment appointment = null;
        Consultation consultation;

        if (request.getQueueEntryId() != null) {
            QueueEntry selectedQueueEntry = queueEntryRepository
                    .findById(request.getQueueEntryId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Queue entry not found"
                    ));

            lockedQueueEntries = new ArrayList<>(
                    queueEntryRepository.findAndLockDepartmentQueue(
                            selectedQueueEntry.getDepartmentId(),
                            List.of(
                                    QueueStatus.WAITING,
                                    QueueStatus.CALLED,
                                    QueueStatus.IN_CONSULTATION
                            )
                    )
            );

            queueEntry = lockedQueueEntries.stream()
                    .filter(entry -> entry.getId().equals(request.getQueueEntryId()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalStateException(
                            "The queue entry is no longer active"
                    ));

            validateQueueConsultation(queueEntry, doctor);
            appointment = queueEntry.getAppointment();

            Consultation existing = consultationRepository
                    .findByQueueEntryId(queueEntry.getId())
                    .orElse(null);

            if (request.getConsultationId() != null) {
                consultation = consultationRepository
                        .findById(request.getConsultationId())
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "Consultation not found"
                        ));
                if (consultation.getQueueEntry() == null
                        || !queueEntry.getId().equals(
                        consultation.getQueueEntry().getId()
                )) {
                    throw new IllegalArgumentException(
                            "The consultation does not belong to the selected queue entry"
                    );
                }
            } else if (existing != null) {
                consultation = existing;
            } else {
                Patient patient = appointment.getPatient();
                LocalDateTime scheduledAt = queueEntry.getScheduledTime() != null
                        ? queueEntry.getScheduledTime()
                        : appointment.getScheduledTime();

                consultation = consultationRepository.saveAndFlush(
                        Consultation.builder()
                                .patient(patient)
                                .doctor(doctor)
                                .queueEntry(queueEntry)
                                .scheduledAt(scheduledAt == null
                                        ? LocalDateTime.now()
                                        : scheduledAt)
                                .startedAt(LocalDateTime.now())
                                .status(ConsultationStatus.IN_PROGRESS)
                                .build()
                );
            }
        } else {
            consultation = consultationRepository
                    .findById(request.getConsultationId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Consultation not found"
                    ));
        }

        validateAssignedDoctor(consultation, doctor);
        validateCompletableStatus(consultation);

        CreateClinicalRecordRequest recordRequest = toClinicalRecordRequest(
                request,
                consultation.getId()
        );
        ClinicalRecordResponse clinicalRecord =
                clinicalRecordService.createClinicalRecord(
                        authenticatedDoctorEmail,
                        recordRequest
                );

        List<String> drugs = sanitizeDrugs(request.getDrugs());
        PrescriptionResponse prescription = null;
        if (!drugs.isEmpty()) {
            PrescriptionRequest prescriptionRequest = new PrescriptionRequest();
            prescriptionRequest.setConsultationId(consultation.getId());
            prescriptionRequest.setDrugs(drugs);
            prescription = prescriptionService.issuePrescription(
                    prescriptionRequest,
                    authenticatedDoctorEmail
            );
        }

        List<LabOrderResponse> labOrders = new ArrayList<>();
        for (LabOrderItemRequest item : safeLabOrders(request.getLabOrders())) {
            LabOrderRequest labRequest = new LabOrderRequest();
            labRequest.setConsultationId(consultation.getId());
            labRequest.setTestName(item.getTestName().trim());
            labRequest.setClinicalReason(clean(item.getClinicalReason()));
            labRequest.setInstructions(clean(item.getInstructions()));
            labOrders.add(labService.createOrder(
                    authenticatedDoctorEmail,
                    labRequest
            ));
        }

        LocalDateTime now = LocalDateTime.now();
        consultation.setStatus(ConsultationStatus.COMPLETED);
        consultation.setEndedAt(now);
        if (consultation.getStartedAt() == null) {
            consultation.setStartedAt(now);
        }
        consultation.setNotes(clean(request.getConsultationNotes()));
        consultationRepository.save(consultation);

        if (queueEntry != null && appointment != null) {
            queueEntry.setStatus(QueueStatus.COMPLETED);
            queueEntry.setCurrentPosition(0);
            queueEntry.setEstimatedCallTime(null);
            queueEntry.setUpdatedAt(now);
            appointment.setStatus(AppointmentStatus.COMPLETED);
            appointment.setQueuePosition(0);
            queueEntryRepository.save(queueEntry);
            recalculateDepartmentQueue(
                    lockedQueueEntries,
                    queueEntry.getId(),
                    now
            );
        }

        return ConsultationCompletionResponse.builder()
                .consultationId(consultation.getId())
                .clinicalRecord(clinicalRecord)
                .prescription(prescription)
                .labOrders(List.copyOf(labOrders))
                .build();
    }

    private void recalculateDepartmentQueue(
            List<QueueEntry> lockedEntries,
            UUID completedEntryId,
            LocalDateTime calculationTime
    ) {
        List<QueueEntry> remainingEntries = lockedEntries.stream()
                .filter(entry -> !entry.getId().equals(completedEntryId))
                .toList();

        List<QueueEntry> waitingEntries = remainingEntries.stream()
                .filter(entry -> entry.getStatus() == QueueStatus.WAITING)
                .sorted(waitingQueueComparator())
                .toList();

        boolean hasActivePatient = remainingEntries.stream()
                .anyMatch(entry -> entry.getStatus() == QueueStatus.CALLED
                        || entry.getStatus() == QueueStatus.IN_CONSULTATION);
        int activeOffset = hasActivePatient ? 1 : 0;

        for (int index = 0; index < waitingEntries.size(); index++) {
            QueueEntry entry = waitingEntries.get(index);
            int position = index + 1;
            int waitMinutes = (index + activeOffset) * 15;
            entry.setCurrentPosition(position);
            entry.setEstimatedCallTime(calculationTime.plusMinutes(waitMinutes));
            if (entry.getAppointment() != null) {
                entry.getAppointment().setQueuePosition(position);
            }
        }

        remainingEntries.stream()
                .filter(entry -> entry.getStatus() == QueueStatus.CALLED
                        || entry.getStatus() == QueueStatus.IN_CONSULTATION)
                .forEach(entry -> {
                    entry.setCurrentPosition(0);
                    if (entry.getAppointment() != null) {
                        entry.getAppointment().setQueuePosition(0);
                    }
                    if (entry.getEstimatedCallTime() == null) {
                        entry.setEstimatedCallTime(calculationTime);
                    }
                });

        queueEntryRepository.saveAll(remainingEntries);
    }

    private Comparator<QueueEntry> waitingQueueComparator() {
        return Comparator
                .comparing((QueueEntry entry) -> entry.getLastSkippedAt() != null)
                .thenComparing(
                        QueueEntry::getSeverityScore,
                        Comparator.nullsLast(Comparator.reverseOrder())
                )
                .thenComparing(
                        QueueEntry::isEmergency,
                        Comparator.reverseOrder()
                )
                .thenComparing(
                        QueueEntry::isPremium,
                        Comparator.reverseOrder()
                )
                .thenComparing(
                        QueueEntry::getScheduledTime,
                        Comparator.nullsLast(Comparator.naturalOrder())
                )
                .thenComparing(
                        QueueEntry::getCreatedAt,
                        Comparator.nullsLast(Comparator.naturalOrder())
                )
                .thenComparing(
                        QueueEntry::getLastSkippedAt,
                        Comparator.nullsLast(Comparator.naturalOrder())
                );
    }

    private CreateClinicalRecordRequest toClinicalRecordRequest(
            CompleteConsultationRequest source,
            UUID consultationId
    ) {
        CreateClinicalRecordRequest target = new CreateClinicalRecordRequest();
        target.setQueueEntryId(source.getQueueEntryId());
        target.setConsultationId(consultationId);
        target.setDiagnosis(source.getDiagnosis());
        target.setConsultationNotes(source.getConsultationNotes());
        target.setPrescription(String.join(", ", sanitizeDrugs(source.getDrugs())));
        target.setLabRequest(
                safeLabOrders(source.getLabOrders()).stream()
                        .map(LabOrderItemRequest::getTestName)
                        .map(this::clean)
                        .filter(value -> value != null)
                        .reduce((left, right) -> left + ", " + right)
                        .orElse(null)
        );
        target.setTemperatureCelsius(source.getTemperatureCelsius());
        target.setBloodPressure(source.getBloodPressure());
        target.setPulseRate(source.getPulseRate());
        target.setRespiratoryRate(source.getRespiratoryRate());
        target.setOxygenSaturation(source.getOxygenSaturation());
        target.setWeightKg(source.getWeightKg());
        target.setFollowUpInstructions(source.getFollowUpInstructions());
        target.setReferralNotes(source.getReferralNotes());
        return target;
    }

    private Doctor findDoctor(String email) {
        if (email == null || email.isBlank()) {
            throw new UnauthorizedException(
                    "Authenticated doctor email is required"
            );
        }
        return doctorRepository
                .findByEmailIgnoreCaseAndIsDeletedFalse(email.trim())
                .filter(staff -> staff.getRole() == Role.DOCTOR)
                .orElseThrow(() -> new UnauthorizedException(
                        "Authenticated doctor account was not found or is inactive"
                ));
    }

    private void validateRequest(CompleteConsultationRequest request) {
        if (request == null) {
            throw new IllegalArgumentException(
                    "Consultation completion request is required"
            );
        }
        if (request.getQueueEntryId() == null
                && request.getConsultationId() == null) {
            throw new IllegalArgumentException(
                    "A queue entry or consultation ID is required"
            );
        }
        if (request.getDiagnosis() == null || request.getDiagnosis().isBlank()) {
            throw new IllegalArgumentException("Diagnosis is required");
        }
    }

    private void validateQueueConsultation(QueueEntry queueEntry, Doctor doctor) {
        if (queueEntry.getStatus() != QueueStatus.IN_CONSULTATION) {
            throw new IllegalStateException(
                    "The patient must be in consultation before it can be completed"
            );
        }
        Appointment appointment = queueEntry.getAppointment();
        if (appointment == null || appointment.getPatient() == null) {
            throw new ResourceNotFoundException(
                    "The queue entry does not have a valid appointment and patient"
            );
        }
        if (appointment.getDepartment() == null
                || doctor.getDepartment() == null
                || !appointment.getDepartment().getId().equals(
                doctor.getDepartment().getId()
        )) {
            throw new UnauthorizedException(
                    "You cannot complete a consultation for another department"
            );
        }
    }

    private void validateAssignedDoctor(Consultation consultation, Doctor doctor) {
        if (consultation.getDoctor() == null
                || !doctor.getId().equals(consultation.getDoctor().getId())) {
            throw new UnauthorizedException(
                    "Only the assigned doctor can complete this consultation"
            );
        }
    }

    private void validateCompletableStatus(Consultation consultation) {
        if (consultation.getStatus() != ConsultationStatus.IN_PROGRESS) {
            throw new IllegalStateException(
                    "Only an in-progress consultation can be completed"
            );
        }
    }

    private List<String> sanitizeDrugs(List<String> values) {
        if (values == null) {
            return List.of();
        }
        LinkedHashMap<String, String> unique = new LinkedHashMap<>();
        for (String value : values) {
            String cleaned = clean(value);
            if (cleaned != null) {
                unique.putIfAbsent(cleaned.toLowerCase(java.util.Locale.ROOT), cleaned);
            }
        }
        return List.copyOf(unique.values());
    }

    private List<LabOrderItemRequest> safeLabOrders(
            List<LabOrderItemRequest> values
    ) {
        if (values == null) {
            return List.of();
        }
        return values.stream()
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    private String clean(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
