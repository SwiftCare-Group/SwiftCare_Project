package com.swiftcare.backend.clinicalrecord;

import com.swiftcare.backend.appointment.Appointment;
import com.swiftcare.backend.clinicalrecord.dto.ClinicalRecordResponse;
import com.swiftcare.backend.clinicalrecord.dto.CreateClinicalRecordRequest;
import com.swiftcare.backend.common.enums.AppointmentStatus;
import com.swiftcare.backend.common.enums.QueueStatus;
import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.common.exception.UnauthorizedException;
import com.swiftcare.backend.consultation.Doctor;
import com.swiftcare.backend.consultation.DoctorRepository;
import com.swiftcare.backend.patient.Patient;
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
public class ClinicalRecordService {

    private final ClinicalRecordRepository clinicalRecordRepository;
    private final QueueEntryRepository queueEntryRepository;
    private final DoctorRepository doctorRepository;

    @Transactional
    public ClinicalRecordResponse createAndCompleteClinicalRecord(
            String doctorEmail,
            CreateClinicalRecordRequest request
    ) {
        validateRequest(doctorEmail, request);

        Doctor doctor = findActiveDoctor(doctorEmail);

        QueueEntry queueEntry = queueEntryRepository
                .findById(request.getQueueEntryId())
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Queue entry not found"
                        )
                );

        validateQueueEntry(queueEntry);
        validateNoExistingRecord(queueEntry.getId());

        Appointment appointment = queueEntry.getAppointment();

        if (appointment == null) {
            throw new ResourceNotFoundException(
                    "Appointment linked to this queue entry was not found"
            );
        }

        Patient patient = appointment.getPatient();

        if (patient == null) {
            throw new ResourceNotFoundException(
                    "Patient linked to this appointment was not found"
            );
        }

        validateDoctorDepartment(
                doctor,
                appointment
        );

        ClinicalRecord clinicalRecord =
                ClinicalRecord.builder()
                        .queueEntry(queueEntry)
                        .appointment(appointment)
                        .patient(patient)
                        .doctor(doctor)
                        .diagnosis(
                                request.getDiagnosis().trim()
                        )
                        .consultationNotes(
                                cleanText(
                                        request.getConsultationNotes()
                                )
                        )
                        .prescription(
                                cleanText(
                                        request.getPrescription()
                                )
                        )
                        .labRequest(
                                cleanText(
                                        request.getLabRequest()
                                )
                        )
                        .build();

        ClinicalRecord savedRecord =
                clinicalRecordRepository.saveAndFlush(
                        clinicalRecord
                );

        completeQueueEntry(
                queueEntry,
                appointment
        );

        return mapToResponse(savedRecord);
    }

    @Transactional
    public ClinicalRecordResponse createClinicalRecord(
            String doctorEmail,
            CreateClinicalRecordRequest request
    ) {
        return createAndCompleteClinicalRecord(
                doctorEmail,
                request
        );
    }

    @Transactional(readOnly = true)
    public ClinicalRecordResponse getClinicalRecord(
            UUID clinicalRecordId
    ) {
        if (clinicalRecordId == null) {
            throw new IllegalArgumentException(
                    "Clinical record ID is required"
            );
        }

        ClinicalRecord record = clinicalRecordRepository
                .findById(clinicalRecordId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Clinical record not found"
                        )
                );

        return mapToResponse(record);
    }

    @Transactional(readOnly = true)
    public ClinicalRecordResponse getByQueueEntry(
            UUID queueEntryId
    ) {
        if (queueEntryId == null) {
            throw new IllegalArgumentException(
                    "Queue entry ID is required"
            );
        }

        ClinicalRecord record = clinicalRecordRepository
                .findByQueueEntryId(queueEntryId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Clinical record not found"
                        )
                );

        return mapToResponse(record);
    }

    @Transactional(readOnly = true)
    public List<ClinicalRecordResponse> getPatientRecords(
            UUID patientId
    ) {
        if (patientId == null) {
            throw new IllegalArgumentException(
                    "Patient ID is required"
            );
        }

        return clinicalRecordRepository
                .findAllByPatientIdOrderByCreatedAtDesc(
                        patientId
                )
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ClinicalRecordResponse> getDoctorRecords(
            String doctorEmail
    ) {
        Doctor doctor = findActiveDoctor(doctorEmail);

        return clinicalRecordRepository
                .findAllByDoctorIdOrderByCreatedAtDesc(
                        doctor.getId()
                )
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    private void completeQueueEntry(
            QueueEntry queueEntry,
            Appointment appointment
    ) {
        LocalDateTime now = LocalDateTime.now();

        queueEntry.setStatus(
                QueueStatus.COMPLETED
        );

        queueEntry.setCurrentPosition(0);
        queueEntry.setEstimatedCallTime(null);
        queueEntry.setUpdatedAt(now);

        appointment.setStatus(
                AppointmentStatus.COMPLETED
        );

        queueEntryRepository.save(queueEntry);
    }

    private Doctor findActiveDoctor(
            String doctorEmail
    ) {
        if (doctorEmail == null ||
                doctorEmail.isBlank()) {

            throw new UnauthorizedException(
                    "Authenticated doctor email is required"
            );
        }

        Doctor doctor = doctorRepository
                .findByEmail(doctorEmail.trim())
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Authenticated doctor account not found"
                        )
                );

        if (doctor.isDeleted()) {
            throw new UnauthorizedException(
                    "This doctor account is inactive"
            );
        }

        return doctor;
    }

    private void validateRequest(
            String doctorEmail,
            CreateClinicalRecordRequest request
    ) {
        if (doctorEmail == null ||
                doctorEmail.isBlank()) {

            throw new UnauthorizedException(
                    "Authenticated doctor email is required"
            );
        }

        if (request == null) {
            throw new IllegalArgumentException(
                    "Clinical record request is required"
            );
        }

        if (request.getQueueEntryId() == null) {
            throw new IllegalArgumentException(
                    "Queue entry ID is required"
            );
        }

        if (request.getDiagnosis() == null ||
                request.getDiagnosis().isBlank()) {

            throw new IllegalArgumentException(
                    "Diagnosis is required"
            );
        }

        if (request.getDiagnosis().trim().length() > 500) {
            throw new IllegalArgumentException(
                    "Diagnosis cannot exceed 500 characters"
            );
        }
    }

    private void validateQueueEntry(
            QueueEntry queueEntry
    ) {
        if (queueEntry.getStatus()
                == QueueStatus.COMPLETED) {

            throw new IllegalStateException(
                    "This consultation has already been completed"
            );
        }

        if (queueEntry.getStatus()
                == QueueStatus.CANCELLED) {

            throw new IllegalStateException(
                    "A cancelled queue entry cannot be completed"
            );
        }

        if (queueEntry.getStatus()
                != QueueStatus.IN_CONSULTATION) {

            throw new IllegalStateException(
                    "The patient must be in consultation before the clinical record can be saved"
            );
        }
    }

    private void validateNoExistingRecord(
            UUID queueEntryId
    ) {
        if (clinicalRecordRepository
                .existsByQueueEntryId(queueEntryId)) {

            throw new IllegalStateException(
                    "A clinical record already exists for this queue entry"
            );
        }
    }

    private void validateDoctorDepartment(
            Doctor doctor,
            Appointment appointment
    ) {
        if (appointment.getDepartment() == null) {
            throw new ResourceNotFoundException(
                    "Department linked to this appointment was not found"
            );
        }

        if (doctor.getDepartment() == null) {
            throw new UnauthorizedException(
                    "The doctor is not assigned to a department"
            );
        }

        UUID appointmentDepartmentId =
                appointment.getDepartment().getId();

        UUID doctorDepartmentId =
                doctor.getDepartment().getId();

        System.out.println(
                "DOCTOR DEPARTMENT ID: " +
                        doctorDepartmentId
        );

        System.out.println(
                "APPOINTMENT DEPARTMENT ID: " +
                        appointmentDepartmentId
        );

        if (!appointmentDepartmentId.equals(
                doctorDepartmentId
        )) {
            throw new UnauthorizedException(
                    "You cannot complete a consultation for another department"
            );
        }
    }

    private ClinicalRecordResponse mapToResponse(
            ClinicalRecord record
    ) {
        return ClinicalRecordResponse.builder()
                .id(record.getId())
                .queueEntryId(
                        record.getQueueEntry().getId()
                )
                .appointmentId(
                        record.getAppointment().getId()
                )
                .patientId(
                        record.getPatient().getId()
                )
                .patientName(
                        record.getPatient().getName()
                )
                .doctorId(
                        record.getDoctor().getId()
                )
                .doctorName(
                        record.getDoctor().getName()
                )
                .departmentId(
                        record.getAppointment()
                                .getDepartment()
                                .getId()
                )
                .departmentName(
                        record.getAppointment()
                                .getDepartment()
                                .getName()
                )
                .diagnosis(record.getDiagnosis())
                .consultationNotes(
                        record.getConsultationNotes()
                )
                .prescription(
                        record.getPrescription()
                )
                .labRequest(
                        record.getLabRequest()
                )
                .createdAt(record.getCreatedAt())
                .updatedAt(record.getUpdatedAt())
                .build();
    }

    private String cleanText(
            String value
    ) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }
}