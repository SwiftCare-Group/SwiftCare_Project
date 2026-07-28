package com.swiftcare.backend.clinicalrecord;

import com.swiftcare.backend.appointment.Appointment;
import com.swiftcare.backend.consultation.Consultation;
import com.swiftcare.backend.consultation.Doctor;
import com.swiftcare.backend.patient.Patient;
import com.swiftcare.backend.queue.QueueEntry;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "clinical_records",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_clinical_record_queue_entry",
                        columnNames = "queue_entry_id"
                ),
                @UniqueConstraint(
                        name = "uk_clinical_record_consultation",
                        columnNames = "consultation_id"
                )
        },
        indexes = {
                @Index(name = "idx_clinical_record_patient", columnList = "patient_id"),
                @Index(name = "idx_clinical_record_doctor", columnList = "doctor_id"),
                @Index(name = "idx_clinical_record_appointment", columnList = "appointment_id"),
                @Index(name = "idx_clinical_record_consultation", columnList = "consultation_id"),
                @Index(name = "idx_clinical_record_created_at", columnList = "created_at")
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClinicalRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "queue_entry_id", unique = true)
    private QueueEntry queueEntry;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id")
    private Appointment appointment;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "consultation_id", unique = true)
    private Consultation consultation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @Column(nullable = false, length = 500)
    private String diagnosis;

    @Column(name = "consultation_notes", columnDefinition = "TEXT")
    private String consultationNotes;

    @Column(columnDefinition = "TEXT")
    private String prescription;

    @Column(name = "lab_request", columnDefinition = "TEXT")
    private String labRequest;

    @Column(name = "temperature_celsius", precision = 4, scale = 1)
    private BigDecimal temperatureCelsius;

    @Column(name = "blood_pressure", length = 20)
    private String bloodPressure;

    @Column(name = "pulse_rate")
    private Integer pulseRate;

    @Column(name = "respiratory_rate")
    private Integer respiratoryRate;

    @Column(name = "oxygen_saturation")
    private Integer oxygenSaturation;

    @Column(name = "weight_kg", precision = 6, scale = 2)
    private BigDecimal weightKg;

    @Column(name = "follow_up_instructions", columnDefinition = "TEXT")
    private String followUpInstructions;

    @Column(name = "referral_notes", columnDefinition = "TEXT")
    private String referralNotes;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void beforeInsert() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    protected void beforeUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
