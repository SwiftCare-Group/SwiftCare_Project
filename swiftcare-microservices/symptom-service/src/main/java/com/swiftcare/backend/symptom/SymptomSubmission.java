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

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String symptoms;

    /**
     * Severity selected by the patient. This remains the primary score
     * used for the appointment and queue.
     */
    @Column(nullable = false)
    private Integer severityScore;

    @Column(nullable = false, length = 20)
    private String severityLabel;

    /**
     * Separate AI recommendation. AI must not silently overwrite the
     * severity selected by the patient.
     */
    @Column(name = "ai_recommended_severity_score")
    private Integer aiRecommendedSeverityScore;

    @Column(name = "ai_status", length = 30)
    private String aiStatus;

    @Column(nullable = false)
    private Boolean isEmergency;

    @Column(columnDefinition = "TEXT")
    private String firstAidContent;

    @Column(columnDefinition = "TEXT")
    private String aiRawResponse;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }

        /*
         * Do not overwrite a true emergency value supplied by the service.
         * The previous implementation always reset it to false.
         */
        if (isEmergency == null) {
            isEmergency = false;
        }
    }
}