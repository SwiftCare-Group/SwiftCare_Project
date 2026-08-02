package com.swiftcare.backend.consultation;

import com.swiftcare.backend.common.enums.ConsultationStatus;
import com.swiftcare.backend.common.enums.Role;
import com.swiftcare.backend.common.enums.Tier;
import com.swiftcare.backend.consultation.dto.ConsultationResponse;
import com.swiftcare.backend.patient.Patient;
import com.swiftcare.backend.patient.PatientRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConsultationControllerTest {

    @Mock
    private ConsultationService consultationService;
    @Mock
    private ConsultationWorkflowService consultationWorkflowService;
    @Mock
    private PatientRepository patientRepository;
    @Mock
    private DoctorRepository doctorRepository;

    private ConsultationController controller;

    @BeforeEach
    void setUp() {
        controller = new ConsultationController(
                consultationService,
                consultationWorkflowService,
                patientRepository,
                doctorRepository
        );
    }

    @Test
    void premiumTokenCannotBypassExpiredDatabaseEntitlement() {
        Patient patient = patient(Tier.PREMIUM);
        Authentication authentication = authentication(
                patient.getEmail(),
                "PATIENT"
        );
        when(patientRepository.findByEmailIgnoreCaseAndIsDeletedFalse(
                patient.getEmail()
        )).thenReturn(Optional.of(patient));
        when(patientRepository.hasActivePremiumSubscription(patient.getId()))
                .thenReturn(false);

        assertThatThrownBy(() ->
                controller.getAvailableDoctors(authentication)
        )
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("active Premium");

        verify(consultationService, never()).getAvailableDoctors();
    }

    @Test
    void activePremiumPatientCanLoadConsultationDoctors() {
        Patient patient = patient(Tier.PREMIUM);
        Authentication authentication = authentication(
                patient.getEmail(),
                "PATIENT"
        );
        when(patientRepository.findByEmailIgnoreCaseAndIsDeletedFalse(
                patient.getEmail()
        )).thenReturn(Optional.of(patient));
        when(patientRepository.hasActivePremiumSubscription(patient.getId()))
                .thenReturn(true);
        when(consultationService.getAvailableDoctors()).thenReturn(List.of());

        controller.getAvailableDoctors(authentication);

        verify(consultationService).getAvailableDoctors();
    }

    @Test
    void freePatientCanStillCancelAnExistingScheduledConsultation() {
        Patient patient = patient(Tier.FREE);
        Authentication authentication = authentication(
                patient.getEmail(),
                "PATIENT"
        );
        ConsultationResponse consultation = consultation(
                patient.getId(),
                UUID.randomUUID(),
                ConsultationStatus.SCHEDULED
        );
        when(patientRepository.findByEmailIgnoreCaseAndIsDeletedFalse(
                patient.getEmail()
        )).thenReturn(Optional.of(patient));
        when(consultationService.getConsultation(consultation.getId()))
                .thenReturn(consultation);
        when(consultationService.cancelConsultation(consultation.getId()))
                .thenReturn(consultation);

        controller.cancelConsultation(consultation.getId(), authentication);

        verify(patientRepository, never())
                .hasActivePremiumSubscription(patient.getId());
        verify(consultationService)
                .cancelConsultation(consultation.getId());
    }

    @Test
    void assignedDoctorCanJoinWithoutPatientSubscriptionLookup() {
        UUID doctorId = UUID.randomUUID();
        String doctorEmail = "doctor@example.com";
        Doctor doctor = Doctor.builder()
                .id(doctorId)
                .email(doctorEmail)
                .build();
        Authentication authentication = authentication(doctorEmail, "DOCTOR");
        ConsultationResponse consultation = consultation(
                UUID.randomUUID(),
                doctorId,
                ConsultationStatus.SCHEDULED
        );
        when(doctorRepository.findByEmailIgnoreCaseAndIsDeletedFalse(doctorEmail))
                .thenReturn(Optional.of(doctor));
        when(consultationService.getConsultation(consultation.getId()))
                .thenReturn(consultation);
        when(consultationService.joinSession(consultation.getId()))
                .thenReturn(consultation);

        controller.joinConsultation(consultation.getId(), authentication);

        verify(consultationService).joinSession(consultation.getId());
        verify(patientRepository, never())
                .hasActivePremiumSubscription(consultation.getPatientId());
    }

    private Patient patient(Tier tier) {
        return Patient.builder()
                .id(UUID.randomUUID())
                .email("patient@example.com")
                .tier(tier)
                .role(Role.PATIENT)
                .build();
    }

    private ConsultationResponse consultation(
            UUID patientId,
            UUID doctorId,
            ConsultationStatus status
    ) {
        return ConsultationResponse.builder()
                .id(UUID.randomUUID())
                .patientId(patientId)
                .doctorId(doctorId)
                .scheduledAt(LocalDateTime.now().plusMinutes(5))
                .status(status)
                .build();
    }

    private Authentication authentication(String email, String role) {
        return new UsernamePasswordAuthenticationToken(
                email,
                "unused",
                List.of(new SimpleGrantedAuthority("ROLE_" + role))
        );
    }
}