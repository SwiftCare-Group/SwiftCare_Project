package com.swiftcare.backend.appointment;

import com.swiftcare.backend.admin.Department;
import com.swiftcare.backend.common.enums.AppointmentStatus;
import com.swiftcare.backend.patient.Patient;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "appointment")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Appointment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    /*
     * Store only the symptom assessment UUID in appointment-service.
     * Do not import the SymptomSubmission entity from symptom-service.
     */
    @Column(name = "symptom_submission_id", unique = true)
    private UUID symptomAssessmentId;

    @Column(nullable = false)
    private LocalDateTime scheduledTime;

    @Column(nullable = false)
    private int queuePosition;

    @Column(nullable = false)
    private int severityScore;

    @Column(nullable = false)
    private boolean isEmergency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AppointmentStatus status;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }

        if (status == null) {
            status = AppointmentStatus.PENDING;
        }
    }
}