package com.swiftcare.backend.lab;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "lab_results",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_lab_results_order_id",
                        columnNames = "lab_order_id"
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /**
     * The laboratory order this result belongs to.
     * One laboratory order should have at most one final result.
     */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "lab_order_id",
        unique = true
)
    private LabOrder labOrder;

    /**
     * Main result produced by the laboratory.
     */
    @Column(
            name = "result",
            nullable = false,
            columnDefinition = "TEXT"
    )
    private String result;

    /**
     * Optional medical interpretation of the result.
     */
    @Column(
            name = "interpretation",
            columnDefinition = "TEXT"
    )
    private String interpretation;

    /**
     * Additional laboratory notes.
     */
    @Column(
            name = "notes",
            columnDefinition = "TEXT"
    )
    private String notes;

    /**
     * Name or identifier of the laboratory worker
     * who recorded the result.
     */
    @Column(
            name = "performed_by",
            length = 150
    )
    private String performedBy;

    @Column(
            name = "performed_at",
            nullable = false
    )
    private LocalDateTime performedAt;

    @Column(
            name = "created_at",
            nullable = false,
            updatable = false
    )
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();

        if (performedAt == null) {
            performedAt = now;
        }

        if (createdAt == null) {
            createdAt = now;
        }

        updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}