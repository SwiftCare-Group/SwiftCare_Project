package com.swiftcare.backend.consultation;

import com.swiftcare.backend.common.enums.ConsultationStatus;
import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.common.exception.UnauthorizedException;
import com.swiftcare.backend.consultation.dto.ConsultationRequest;
import com.swiftcare.backend.consultation.dto.ConsultationResponse;
import com.swiftcare.backend.consultation.dto.DoctorResponse;
import com.swiftcare.backend.patient.Patient;
import com.swiftcare.backend.patient.PatientRepository;
import com.swiftcare.backend.queue.QueueEntry;
import com.swiftcare.backend.queue.QueueEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
@Service
@RequiredArgsConstructor
public class ConsultationService {

    private final ConsultationRepository consultationRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;
    private final QueueEntryRepository queueEntryRepository;

    @Transactional(readOnly = true)
    public List<DoctorResponse> getAvailableDoctors() {
        return doctorRepository
                .findAllByIsAvailableOnlineTrueAndIsDeletedFalse()
                .stream()
                .map(this::mapDoctorToResponse)
                .toList();
    }

    @Transactional
    public ConsultationResponse bookConsultation(
            UUID patientId,
            ConsultationRequest request
    ) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Patient not found")
                );

        Doctor doctor = doctorRepository.findById(request.getDoctorId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Doctor not found")
                );

        QueueEntry queueEntry = queueEntryRepository
                .findById(request.getQueueEntryId())
                .orElseThrow(() ->
                        new ResourceNotFoundException("Queue entry not found")
                );

        validateQueueEntryOwnership(queueEntry, patientId);

        if (consultationRepository.existsByQueueEntryId(queueEntry.getId())) {
            throw new IllegalStateException(
                    "A consultation already exists for this queue entry"
            );
        }

        if (request.getScheduledAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException(
                    "Consultation time must be in the future"
            );
        }

        Consultation consultation = Consultation.builder()
                .patient(patient)
                .doctor(doctor)
                .queueEntry(queueEntry)
                .scheduledAt(request.getScheduledAt())
                .status(ConsultationStatus.SCHEDULED)
                .build();

        Consultation saved = consultationRepository.save(consultation);

        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public ConsultationResponse getConsultation(UUID consultationId) {
        Consultation consultation = findConsultation(consultationId);
        return mapToResponse(consultation);
    }

    @Transactional
    public ConsultationResponse joinSession(UUID consultationId) {
        Consultation consultation = findConsultation(consultationId);

        if (consultation.getStatus() == ConsultationStatus.COMPLETED) {
            throw new IllegalStateException(
                    "A completed consultation cannot be joined"
            );
        }

        if (consultation.getStatus() == ConsultationStatus.CANCELLED) {
            throw new IllegalStateException(
                    "A cancelled consultation cannot be joined"
            );
        }

        if (consultation.getSessionUrl() == null
                || consultation.getSessionUrl().isBlank()) {

            consultation.setSessionUrl(
                    "https://meet.jit.si/swiftcare-" + consultation.getId()
            );
        }

        if (consultation.getStartedAt() == null) {
            consultation.setStartedAt(LocalDateTime.now());
        }

        consultation.setStatus(ConsultationStatus.IN_PROGRESS);

        Consultation updated = consultationRepository.save(consultation);

        return mapToResponse(updated);
    }

    @Transactional
    public ConsultationResponse completeSession(
            UUID consultationId,
            String notes
    ) {
        Consultation consultation = findConsultation(consultationId);

        if (consultation.getStatus() == ConsultationStatus.CANCELLED) {
            throw new IllegalStateException(
                    "A cancelled consultation cannot be completed"
            );
        }

        if (consultation.getStatus() == ConsultationStatus.COMPLETED) {
            throw new IllegalStateException(
                    "Consultation has already been completed"
            );
        }

        consultation.setStatus(ConsultationStatus.COMPLETED);
        consultation.setEndedAt(LocalDateTime.now());
        consultation.setNotes(cleanNullableText(notes));

        Consultation updated = consultationRepository.save(consultation);

        return mapToResponse(updated);
    }

    @Transactional
    public ConsultationResponse cancelConsultation(UUID consultationId) {
        Consultation consultation = findConsultation(consultationId);

        if (consultation.getStatus() == ConsultationStatus.COMPLETED) {
            throw new UnauthorizedException(
                    "Cannot cancel a completed consultation"
            );
        }

        if (consultation.getStatus() == ConsultationStatus.CANCELLED) {
            throw new IllegalStateException(
                    "Consultation has already been cancelled"
            );
        }

        consultation.setStatus(ConsultationStatus.CANCELLED);

        Consultation updated = consultationRepository.save(consultation);

        return mapToResponse(updated);
    }

    @Transactional(readOnly = true)
    public List<ConsultationResponse> getPatientConsultations(UUID patientId) {
        if (!patientRepository.existsById(patientId)) {
            throw new ResourceNotFoundException("Patient not found");
        }

        return consultationRepository
                .findAllByPatientIdOrderByScheduledAtDesc(patientId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ConsultationResponse> getDoctorConsultations(UUID doctorId) {
        if (!doctorRepository.existsById(doctorId)) {
            throw new ResourceNotFoundException("Doctor not found");
        }

        return consultationRepository
                .findAllByDoctorIdOrderByScheduledAtDesc(doctorId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    private Consultation findConsultation(UUID consultationId) {
        return consultationRepository.findById(consultationId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Consultation not found"
                        )
                );
    }

private void validateQueueEntryOwnership(
        QueueEntry queueEntry,
        UUID patientId
) {
    if (queueEntry == null) {
        throw new ResourceNotFoundException(
                "Queue entry not found"
        );
    }

    if (queueEntry.getPatientId() == null) {
        throw new IllegalStateException(
                "Queue entry does not contain a patient ID"
        );
    }

    if (!queueEntry.getPatientId().equals(patientId)) {
        throw new UnauthorizedException(
                "This queue entry does not belong to the logged-in patient"
        );
    }
}    private String cleanNullableText(String value) {
        if (value == null) {
            return null;
        }

        String cleaned = value.trim();
        return cleaned.isEmpty() ? null : cleaned;
    }

    private DoctorResponse mapDoctorToResponse(Doctor doctor) {
        return DoctorResponse.builder()
                .id(doctor.getId())
                .name(doctor.getName())
                .email(doctor.getEmail())
                .licenseNo(doctor.getLicenseNo())
                .departmentId(
                        doctor.getDepartment() != null
                                ? doctor.getDepartment().getId()
                                : null
                )
                .departmentName(
                        doctor.getDepartment() != null
                                ? doctor.getDepartment().getName()
                                : null
                )
                .isAvailableOnline(doctor.isAvailableOnline())
                .build();
    }

    private ConsultationResponse mapToResponse(
            Consultation consultation
    ) {
        return ConsultationResponse.builder()
                .id(consultation.getId())
                .patientId(
                        consultation.getPatient() != null
                                ? consultation.getPatient().getId()
                                : null
                )
                .doctorId(
                        consultation.getDoctor() != null
                                ? consultation.getDoctor().getId()
                                : null
                )
                .queueEntryId(
                        consultation.getQueueEntry() != null
                                ? consultation.getQueueEntry().getId()
                                : null
                )
                .doctorName(
                        consultation.getDoctor() != null
                                ? consultation.getDoctor().getName()
                                : null
                )
                .scheduledAt(consultation.getScheduledAt())
                .startedAt(consultation.getStartedAt())
                .endedAt(consultation.getEndedAt())
                .sessionUrl(consultation.getSessionUrl())
                .status(consultation.getStatus())
                .notes(consultation.getNotes())
                .createdAt(consultation.getCreatedAt())
                .build();
    }
}