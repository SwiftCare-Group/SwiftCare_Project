package com.swiftcare.backend.clinicalrecord;

import com.swiftcare.backend.appointment.Appointment;
import com.swiftcare.backend.clinicalrecord.dto.ClinicalRecordResponse;
import com.swiftcare.backend.clinicalrecord.dto.CreateClinicalRecordRequest;
import com.swiftcare.backend.common.enums.AppointmentStatus;
import com.swiftcare.backend.common.enums.QueueStatus;
import com.swiftcare.backend.common.enums.Role;
import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.common.exception.UnauthorizedException;
import com.swiftcare.backend.consultation.Consultation;
import com.swiftcare.backend.consultation.ConsultationRepository;
import com.swiftcare.backend.consultation.Doctor;
import com.swiftcare.backend.consultation.DoctorRepository;
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
public class ClinicalRecordService {

    private final ClinicalRecordRepository clinicalRecordRepository;
    private final QueueEntryRepository queueEntryRepository;
    private final ConsultationRepository consultationRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;

    @Transactional
    public ClinicalRecordResponse createAndCompleteClinicalRecord(
            String doctorEmail,
            CreateClinicalRecordRequest request
    ) {
        if (request == null || request.getQueueEntryId() == null) {
            throw new IllegalArgumentException(
                    "Queue entry ID is required when completing a queue consultation"
            );
        }

        ClinicalRecord saved = createInternal(doctorEmail, request);
        QueueEntry queueEntry = saved.getQueueEntry();
        Appointment appointment = saved.getAppointment();

        if (queueEntry == null || appointment == null) {
            throw new IllegalStateException(
                    "The queue consultation does not have a linked appointment"
            );
        }

        completeQueueEntry(queueEntry, appointment);
        return mapToResponse(saved);
    }

    @Transactional
    public ClinicalRecordResponse createClinicalRecord(
            String doctorEmail,
            CreateClinicalRecordRequest request
    ) {
        return mapToResponse(createInternal(doctorEmail, request));
    }

    @Transactional(readOnly = true)
    public ClinicalRecordResponse getClinicalRecord(UUID clinicalRecordId) {
        if (clinicalRecordId == null) {
            throw new IllegalArgumentException("Clinical record ID is required");
        }

        return mapToResponse(
                clinicalRecordRepository.findById(clinicalRecordId)
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "Clinical record not found"
                        ))
        );
    }

    @Transactional(readOnly = true)
    public ClinicalRecordResponse getByQueueEntry(UUID queueEntryId) {
        if (queueEntryId == null) {
            throw new IllegalArgumentException("Queue entry ID is required");
        }

        return mapToResponse(
                clinicalRecordRepository.findByQueueEntryId(queueEntryId)
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "Clinical record not found"
                        ))
        );
    }

    @Transactional(readOnly = true)
    public ClinicalRecordResponse getByConsultation(UUID consultationId) {
        if (consultationId == null) {
            throw new IllegalArgumentException("Consultation ID is required");
        }

        return mapToResponse(
                clinicalRecordRepository.findByConsultationId(consultationId)
                        .orElseThrow(() -> new ResourceNotFoundException(
                                "Clinical record not found"
                        ))
        );
    }

    @Transactional(readOnly = true)
    public List<ClinicalRecordResponse> getPatientRecords(UUID patientId) {
        if (patientId == null) {
            throw new IllegalArgumentException("Patient ID is required");
        }

        return clinicalRecordRepository
                .findAllByPatientIdOrderByCreatedAtDesc(patientId)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ClinicalRecordResponse> getDoctorRecords(String doctorEmail) {
        Doctor doctor = findActiveDoctor(doctorEmail);

        return clinicalRecordRepository
                .findAllByDoctorIdOrderByCreatedAtDesc(doctor.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ClinicalRecordResponse> getPatientRecordsByEmail(
            String patientEmail
    ) {
        if (patientEmail == null || patientEmail.isBlank()) {
            throw new UnauthorizedException(
                    "Authenticated patient email is required"
            );
        }

        Patient patient = patientRepository
                .findByEmailIgnoreCaseAndIsDeletedFalse(patientEmail.trim())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Authenticated patient account not found"
                ));

        return clinicalRecordRepository
                .findAllByPatientIdOrderByCreatedAtDesc(patient.getId())
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    private ClinicalRecord createInternal(
            String doctorEmail,
            CreateClinicalRecordRequest request
    ) {
        validateRequest(request);
        Doctor doctor = findActiveDoctor(doctorEmail);

        QueueEntry queueEntry = null;
        Appointment appointment = null;
        Consultation consultation = null;
        Patient patient;

        if (request.getQueueEntryId() != null) {
            queueEntry = queueEntryRepository.findById(request.getQueueEntryId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Queue entry not found"
                    ));
            validateQueueEntry(queueEntry);

            if (clinicalRecordRepository.existsByQueueEntryId(queueEntry.getId())) {
                throw new IllegalStateException(
                        "A clinical record already exists for this queue entry"
                );
            }

            appointment = queueEntry.getAppointment();
            if (appointment == null || appointment.getPatient() == null) {
                throw new ResourceNotFoundException(
                        "The queue entry does not have a valid appointment and patient"
                );
            }

            patient = appointment.getPatient();
            validateDoctorDepartment(doctor, appointment);
        } else {
            patient = null;
        }

        if (request.getConsultationId() != null) {
            consultation = consultationRepository.findById(request.getConsultationId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Consultation not found"
                    ));

            if (clinicalRecordRepository.existsByConsultationId(consultation.getId())) {
                throw new IllegalStateException(
                        "A clinical record already exists for this consultation"
                );
            }

            if (consultation.getDoctor() == null
                    || !doctor.getId().equals(consultation.getDoctor().getId())) {
                throw new UnauthorizedException(
                        "Only the assigned doctor can save this clinical record"
                );
            }

            if (consultation.getPatient() == null) {
                throw new ResourceNotFoundException(
                        "Patient linked to this consultation was not found"
                );
            }

            if (queueEntry != null) {
                if (consultation.getQueueEntry() == null
                        || !queueEntry.getId().equals(
                        consultation.getQueueEntry().getId()
                )) {
                    throw new IllegalArgumentException(
                            "The consultation does not match the selected queue entry"
                    );
                }
                if (!patient.getId().equals(consultation.getPatient().getId())) {
                    throw new IllegalArgumentException(
                            "The consultation patient does not match the queue patient"
                    );
                }
            } else {
                patient = consultation.getPatient();
            }
        }

        if (patient == null) {
            throw new IllegalArgumentException(
                    "A queue entry or consultation ID is required"
            );
        }

        ClinicalRecord record = ClinicalRecord.builder()
                .queueEntry(queueEntry)
                .appointment(appointment)
                .consultation(consultation)
                .patient(patient)
                .doctor(doctor)
                .diagnosis(request.getDiagnosis().trim())
                .consultationNotes(cleanText(request.getConsultationNotes()))
                .prescription(cleanText(request.getPrescription()))
                .labRequest(cleanText(request.getLabRequest()))
                .temperatureCelsius(request.getTemperatureCelsius())
                .bloodPressure(cleanText(request.getBloodPressure()))
                .pulseRate(request.getPulseRate())
                .respiratoryRate(request.getRespiratoryRate())
                .oxygenSaturation(request.getOxygenSaturation())
                .weightKg(request.getWeightKg())
                .followUpInstructions(cleanText(request.getFollowUpInstructions()))
                .referralNotes(cleanText(request.getReferralNotes()))
                .build();

        return clinicalRecordRepository.saveAndFlush(record);
    }

    private void completeQueueEntry(
            QueueEntry queueEntry,
            Appointment appointment
    ) {
        queueEntry.setStatus(QueueStatus.COMPLETED);
        queueEntry.setCurrentPosition(0);
        queueEntry.setEstimatedCallTime(null);
        queueEntry.setUpdatedAt(LocalDateTime.now());
        appointment.setStatus(AppointmentStatus.COMPLETED);
        queueEntryRepository.save(queueEntry);
    }

    private Doctor findActiveDoctor(String doctorEmail) {
        if (doctorEmail == null || doctorEmail.isBlank()) {
            throw new UnauthorizedException(
                    "Authenticated doctor email is required"
            );
        }

        return doctorRepository
                .findByEmailIgnoreCaseAndIsDeletedFalse(doctorEmail.trim())
                .filter(doctor -> doctor.getRole() == Role.DOCTOR)
                .orElseThrow(() -> new UnauthorizedException(
                        "Authenticated doctor account was not found or is inactive"
                ));
    }

    private void validateRequest(CreateClinicalRecordRequest request) {
        if (request == null) {
            throw new IllegalArgumentException(
                    "Clinical record request is required"
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
        if (request.getDiagnosis().trim().length() > 500) {
            throw new IllegalArgumentException(
                    "Diagnosis cannot exceed 500 characters"
            );
        }
    }

    private void validateQueueEntry(QueueEntry queueEntry) {
        if (queueEntry.getStatus() == QueueStatus.COMPLETED) {
            throw new IllegalStateException(
                    "This consultation has already been completed"
            );
        }
        if (queueEntry.getStatus() == QueueStatus.CANCELLED) {
            throw new IllegalStateException(
                    "A cancelled queue entry cannot be completed"
            );
        }
        if (queueEntry.getStatus() != QueueStatus.IN_CONSULTATION) {
            throw new IllegalStateException(
                    "The patient must be in consultation before the clinical record can be saved"
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
        if (!appointment.getDepartment().getId().equals(
                doctor.getDepartment().getId()
        )) {
            throw new UnauthorizedException(
                    "You cannot complete a consultation for another department"
            );
        }
    }

    private ClinicalRecordResponse mapToResponse(ClinicalRecord record) {
        Appointment appointment = record.getAppointment();
        Doctor doctor = record.getDoctor();

        UUID departmentId = null;
        String departmentName = null;
        if (appointment != null && appointment.getDepartment() != null) {
            departmentId = appointment.getDepartment().getId();
            departmentName = appointment.getDepartment().getName();
        } else if (doctor != null && doctor.getDepartment() != null) {
            departmentId = doctor.getDepartment().getId();
            departmentName = doctor.getDepartment().getName();
        }

        return ClinicalRecordResponse.builder()
                .id(record.getId())
                .queueEntryId(record.getQueueEntry() == null
                        ? null : record.getQueueEntry().getId())
                .appointmentId(appointment == null ? null : appointment.getId())
                .consultationId(record.getConsultation() == null
                        ? null : record.getConsultation().getId())
                .patientId(record.getPatient().getId())
                .patientName(record.getPatient().getName())
                .doctorId(doctor.getId())
                .doctorName(doctor.getName())
                .departmentId(departmentId)
                .departmentName(departmentName)
                .diagnosis(record.getDiagnosis())
                .consultationNotes(record.getConsultationNotes())
                .prescription(record.getPrescription())
                .labRequest(record.getLabRequest())
                .temperatureCelsius(record.getTemperatureCelsius())
                .bloodPressure(record.getBloodPressure())
                .pulseRate(record.getPulseRate())
                .respiratoryRate(record.getRespiratoryRate())
                .oxygenSaturation(record.getOxygenSaturation())
                .weightKg(record.getWeightKg())
                .followUpInstructions(record.getFollowUpInstructions())
                .referralNotes(record.getReferralNotes())
                .createdAt(record.getCreatedAt())
                .updatedAt(record.getUpdatedAt())
                .build();
    }

    private String cleanText(String value) {
        if (value == null) {
            return null;
        }
        String cleaned = value.trim();
        return cleaned.isEmpty() ? null : cleaned;
    }
}
