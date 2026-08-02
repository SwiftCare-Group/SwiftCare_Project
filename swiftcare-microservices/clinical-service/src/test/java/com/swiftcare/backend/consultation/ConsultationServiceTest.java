package com.swiftcare.backend.consultation;

import com.swiftcare.backend.common.enums.ConsultationStatus;
import com.swiftcare.backend.patient.Patient;
import com.swiftcare.backend.patient.PatientRepository;
import com.swiftcare.backend.queue.QueueEntryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConsultationServiceTest {

    @Mock
    private ConsultationRepository consultationRepository;
    @Mock
    private DoctorRepository doctorRepository;
    @Mock
    private PatientRepository patientRepository;
    @Mock
    private QueueEntryRepository queueEntryRepository;

    private ConsultationService consultationService;

    @BeforeEach
    void setUp() {
        consultationService = new ConsultationService(
                consultationRepository,
                doctorRepository,
                patientRepository,
                queueEntryRepository
        );
    }

    @Test
    void joinSessionRejectsRequestsMoreThanFifteenMinutesEarly() {
        UUID consultationId = UUID.randomUUID();
        Consultation consultation = consultation(
                consultationId,
                ConsultationStatus.SCHEDULED,
                LocalDateTime.now().plusMinutes(16)
        );
        when(consultationRepository.findById(consultationId))
                .thenReturn(Optional.of(consultation));

        assertThatThrownBy(() -> consultationService.joinSession(consultationId))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("15 minutes");

        verify(consultationRepository, never()).save(any());
    }

    @Test
    void joinSessionStartsConsultationInsideJoinWindow() {
        UUID consultationId = UUID.randomUUID();
        Consultation consultation = consultation(
                consultationId,
                ConsultationStatus.SCHEDULED,
                LocalDateTime.now().plusMinutes(14)
        );
        when(consultationRepository.findById(consultationId))
                .thenReturn(Optional.of(consultation));
        when(consultationRepository.save(any(Consultation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response = consultationService.joinSession(consultationId);

        ArgumentCaptor<Consultation> captor =
                ArgumentCaptor.forClass(Consultation.class);
        verify(consultationRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus())
                .isEqualTo(ConsultationStatus.IN_PROGRESS);
        assertThat(captor.getValue().getStartedAt()).isNotNull();
        assertThat(response.getSessionUrl()).startsWith("https://");
    }

    @Test
    void completeSessionRejectsConsultationThatWasNeverStarted() {
        UUID consultationId = UUID.randomUUID();
        Consultation consultation = consultation(
                consultationId,
                ConsultationStatus.SCHEDULED,
                LocalDateTime.now()
        );
        when(consultationRepository.findById(consultationId))
                .thenReturn(Optional.of(consultation));

        assertThatThrownBy(() ->
                consultationService.completeSession(consultationId, "notes")
        )
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("in-progress");

        verify(consultationRepository, never()).save(any());
    }

    @Test
    void completeSessionFinishesAnInProgressConsultation() {
        UUID consultationId = UUID.randomUUID();
        Consultation consultation = consultation(
                consultationId,
                ConsultationStatus.IN_PROGRESS,
                LocalDateTime.now().minusMinutes(10)
        );
        when(consultationRepository.findById(consultationId))
                .thenReturn(Optional.of(consultation));
        when(consultationRepository.save(any(Consultation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response = consultationService.completeSession(
                consultationId,
                "Follow up in seven days"
        );

        assertThat(response.getStatus())
                .isEqualTo(ConsultationStatus.COMPLETED);
        assertThat(response.getEndedAt()).isNotNull();
        assertThat(response.getNotes()).isEqualTo("Follow up in seven days");
    }

    private Consultation consultation(
            UUID id,
            ConsultationStatus status,
            LocalDateTime scheduledAt
    ) {
        Patient patient = Patient.builder()
                .id(UUID.randomUUID())
                .build();
        Doctor doctor = Doctor.builder()
                .id(UUID.randomUUID())
                .name("Dr Test")
                .build();

        return Consultation.builder()
                .id(id)
                .patient(patient)
                .doctor(doctor)
                .scheduledAt(scheduledAt)
                .status(status)
                .createdAt(LocalDateTime.now().minusMinutes(20))
                .build();
    }
}