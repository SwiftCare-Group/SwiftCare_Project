package com.swiftcare.backend.consultation;

import com.swiftcare.backend.common.enums.ConsultationStatus;
import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.common.exception.UnauthorizedException;
import com.swiftcare.backend.consultation.dto.ConsultationRequest;
import com.swiftcare.backend.consultation.dto.ConsultationResponse;
import com.swiftcare.backend.consultation.dto.DoctorResponse;
import com.swiftcare.backend.patient.Patient;
import com.swiftcare.backend.patient.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ConsultationService {

    private final ConsultationRepository consultationRepository;
    private final DoctorRepository doctorRepository;
    private final PatientRepository patientRepository;

    public List<DoctorResponse> getAvailableDoctors() {
        return doctorRepository.findAllByIsAvailableOnlineTrueAndIsDeletedFalse()
                .stream()
                .map(d -> DoctorResponse.builder()
                        .id(d.getId())
                        .name(d.getName())
                        .email(d.getEmail())
                        .licenseNo(d.getLicenseNo())
                        .departmentId(d.getDepartment().getId())
                        .departmentName(d.getDepartment().getName())
                        .isAvailableOnline(d.isAvailableOnline())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    public ConsultationResponse bookConsultation(UUID patientId, ConsultationRequest request) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));

        Doctor doctor = doctorRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found"));

        Consultation consultation = Consultation.builder()
                .patient(patient)
                .doctor(doctor)
                .scheduledAt(request.getScheduledAt())
                .build();

        Consultation saved = consultationRepository.save(consultation);
        return mapToResponse(saved);
    }

    public ConsultationResponse getConsultation(UUID consultationId) {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation not found"));
        return mapToResponse(consultation);
    }

    @Transactional
    public ConsultationResponse joinSession(UUID consultationId) {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation not found"));

        String sessionUrl = "https://meet.jit.si/swiftcare-" + consultationId;
        consultation.setSessionUrl(sessionUrl);
        consultation.setStartedAt(LocalDateTime.now());
        consultation.setStatus(ConsultationStatus.IN_PROGRESS);

        Consultation updated = consultationRepository.save(consultation);
        return mapToResponse(updated);
    }

    @Transactional
    public ConsultationResponse completeSession(UUID consultationId, String notes) {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation not found"));

        consultation.setStatus(ConsultationStatus.COMPLETED);
        consultation.setEndedAt(LocalDateTime.now());
        consultation.setNotes(notes);

        Consultation updated = consultationRepository.save(consultation);
        return mapToResponse(updated);
    }

    @Transactional
    public ConsultationResponse cancelConsultation(UUID consultationId) {
        Consultation consultation = consultationRepository.findById(consultationId)
                .orElseThrow(() -> new ResourceNotFoundException("Consultation not found"));

        if (consultation.getStatus() == ConsultationStatus.COMPLETED) {
            throw new UnauthorizedException("Cannot cancel a completed consultation");
        }

        consultation.setStatus(ConsultationStatus.CANCELLED);
        Consultation updated = consultationRepository.save(consultation);
        return mapToResponse(updated);
    }

    public List<ConsultationResponse> getPatientConsultations(UUID patientId) {
        return consultationRepository
                .findAllByPatientIdOrderByScheduledAtDesc(patientId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private ConsultationResponse mapToResponse(Consultation consultation) {
        return ConsultationResponse.builder()
                .id(consultation.getId())
                .patientId(consultation.getPatient().getId())
                .doctorId(consultation.getDoctor().getId())
                .doctorName(consultation.getDoctor().getName())
                .scheduledAt(consultation.getScheduledAt())
                .startedAt(consultation.getStartedAt())
                .endedAt(consultation.getEndedAt())
                .sessionUrl(consultation.getSessionUrl())
                .status(consultation.getStatus())
                .notes(consultation.getNotes())
                .createdAt(consultation.getCreatedAt())
                .build();
    }

    public List<ConsultationResponse> getDoctorConsultations(UUID doctorId) {
        return consultationRepository
                .findAllByDoctorIdAndStatus(doctorId, ConsultationStatus.SCHEDULED)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
}