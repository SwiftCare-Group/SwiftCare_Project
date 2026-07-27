package com.swiftcare.backend.lab;

import com.swiftcare.backend.consultation.Consultation;
import com.swiftcare.backend.patient.Patient;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "lab_orders",
        indexes = {
                @Index(
                        name = "idx_lab_orders_patient_id",
                        columnList = "patient_id"
                ),
                @Index(
                        name = "idx_lab_orders_consultation_id",
                        columnList = "consultation_id"
                ),
                @Index(
                        name = "idx_lab_orders_status",
                        columnList = "status"
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "consultation_id",
            nullable = false
    )
    private Consultation consultation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "patient_id",
            nullable = false
    )
    private Patient patient;

    @Column(
            name = "test_name",
            nullable = false,
            length = 150
    )
    private String testName;

    @Column(
            name = "clinical_reason",
            columnDefinition = "TEXT"
    )
    private String clinicalReason;

    @Column(
            name = "instructions",
            columnDefinition = "TEXT"
    )
    private String instructions;

    @Enumerated(EnumType.STRING)
    @Column(
            name = "status",
            nullable = false,
            length = 30
    )
    private LabStatus status;

    @Column(
            name = "ordered_at",
            nullable = false,
            updatable = false
    )
    private LocalDateTime orderedAt;

    @Column(
            name = "updated_at",
            nullable = false
    )
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();

        if (status == null) {
            status = LabStatus.ORDERED;
        }

        if (orderedAt == null) {
            orderedAt = now;
        }

        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}