package com.swiftcare.backend.symptom;

import com.swiftcare.backend.patient.Patient;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "symptom_submissions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SymptomSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String symptoms;

    @Column
    private Integer severityScore;

    @Column
    private String severityLabel;

    @Column
    private Boolean isEmergency;

    @Column(columnDefinition = "TEXT")
    private String firstAidContent;

    @Column(columnDefinition = "TEXT")
    private String aiRawResponse;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.isEmergency = false;
    }
}