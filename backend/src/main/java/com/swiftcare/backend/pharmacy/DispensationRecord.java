package com.swiftcare.backend.pharmacy;

import com.swiftcare.backend.common.enums.DispensationStatus;
import com.swiftcare.backend.prescription.Prescription;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "dispensation_records")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DispensationRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prescription_id", nullable = false)
    private Prescription prescription;

    @Column(nullable = false)
    private String drugName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DispensationStatus status;

    @Column
    private String pharmacyName;

    @Column
    private LocalDateTime dispensedAt;

    @PrePersist
    protected void onCreate() {
        this.status = DispensationStatus.PENDING;
    }
}