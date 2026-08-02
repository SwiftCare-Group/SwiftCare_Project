package com.swiftcare.backend.prescription;

import com.swiftcare.backend.consultation.Consultation;
import com.swiftcare.backend.consultation.Doctor;
import com.swiftcare.backend.patient.Patient;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "prescriptions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Prescription {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "consultation_id", nullable = false)
    private Consultation consultation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
            name = "prescription_drugs",
            joinColumns = @JoinColumn(
                    name = "prescription_id",
                    nullable = false
            )
    )
    @Column(name = "drug", nullable = false)
    @Builder.Default
    private List<String> drugs = new ArrayList<>();

    @Column(
            name = "qr_code_data",
            nullable = false,
            columnDefinition = "TEXT"
    )
    private String qrCodeData;

    @Column(
            name = "qr_code_hash",
            nullable = false,
            unique = true
    )
    private String qrCodeHash;

    @Column(
            name = "issued_at",
            nullable = false,
            updatable = false
    )
    private LocalDateTime issuedAt;

    @PrePersist
    protected void onCreate() {
        if (issuedAt == null) {
            issuedAt = LocalDateTime.now();
        }
    }
}