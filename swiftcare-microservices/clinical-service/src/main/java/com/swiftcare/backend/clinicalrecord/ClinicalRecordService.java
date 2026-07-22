package com.swiftcare.backend.clinicalrecord;

import com.swiftcare.backend.appointment.Appointment;
import com.swiftcare.backend.clinicalrecord.dto.ClinicalRecordResponse;
import com.swiftcare.backend.clinicalrecord.dto.CreateClinicalRecordRequest;
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

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ClinicalRecordService {

    private final ClinicalRecordRepository clinicalRecordRepository;
    private final QueueEntryRepository queueEntryRepository;
    private final DoctorRepository doctorRepository;

    @Transactional
    public ClinicalRecordResponse createClinicalRecord(
            String doctorEmail,
            CreateClinicalRecordRequest request
    ) {
        Doctor doctor = doctorRepository
                .findByEmail(doctorEmail)
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

        QueueEntry queueEntry = queueEntryRepository
                .findById(request.getQueueEntryId())
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Queue entry not found"
                        )
                );

        if (queueEntry.getStatus()
                != QueueStatus.IN_CONSULTATION) {
            throw new IllegalStateException(
                    "The patient must be in consultation before a clinical record can be saved"
            );
        }

        if (clinicalRecordRepository.existsByQueueEntryId(
                queueEntry.getId()
        )) {
            throw new IllegalStateException(
                    "A clinical record already exists for this queue entry"
            );
        }

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
        "DOCTOR EMAIL: " + doctorEmail
);

System.out.println(
        "DOCTOR DEPARTMENT ID: " +
                doctorDepartmentId
);

System.out.println(
        "APPOINTMENT DEPARTMENT ID: " +
                appointmentDepartmentId
);

// TEMPORARILY DISABLED FOR DEMO
// TODO: Re-enable department authorization before production.
//
// if (!appointmentDepartmentId.equals(doctorDepartmentId)) {
//     throw new UnauthorizedException(
//             "You cannot complete a consultation for another department"
//     );
// } 
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

        ClinicalRecord saved =
                clinicalRecordRepository.save(clinicalRecord);

        return mapToResponse(saved);
    }

    @Transactional(readOnly = true)
    public ClinicalRecordResponse getClinicalRecord(
            UUID clinicalRecordId
    ) {
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
        return clinicalRecordRepository
                .findAllByPatientIdOrderByCreatedAtDesc(
                        patientId
                )
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
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
                .prescription(record.getPrescription())
                .labRequest(record.getLabRequest())
                .createdAt(record.getCreatedAt())
                .updatedAt(record.getUpdatedAt())
                .build();
    }

    private String cleanText(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }
}