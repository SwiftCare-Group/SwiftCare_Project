package com.swiftcare.backend.pharmacy;

import com.swiftcare.backend.common.enums.DispensationStatus;
import com.swiftcare.backend.prescription.Prescription;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "dispensation_records",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_dispensation_prescription_drug",
                        columnNames = {
                                "prescription_id",
                                "drug_name"
                        }
                )
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DispensationRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "prescription_id",
            nullable = false
    )
    private Prescription prescription;

    @Column(
            name = "drug_name",
            nullable = false,
            length = 255
    )
    private String drugName;

    @Enumerated(EnumType.STRING)
    @Column(
            name = "status",
            nullable = false,
            length = 30
    )
    @Builder.Default
    private DispensationStatus status =
            DispensationStatus.PENDING;

    @Column(
            name = "pharmacy_name",
            length = 255
    )
    private String pharmacyName;

    @Column(name = "dispensed_at")
    private LocalDateTime dispensedAt;

    @PrePersist
    protected void onCreate() {
        if (status == null) {
            status = DispensationStatus.PENDING;
        }
    }
}