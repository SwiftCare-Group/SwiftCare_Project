package com.swiftcare.backend.queue;

import com.swiftcare.backend.appointment.Appointment;
import com.swiftcare.backend.common.enums.QueueStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "queue_entries",
        indexes = {
                @Index(
                        name = "idx_queue_department_status",
                        columnList = "department_id,status"
                ),
                @Index(
                        name = "idx_queue_department_position",
                        columnList = "department_id,current_position"
                )
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QueueEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /*
     * Prevents two requests from updating the same queue entry
     * without detecting the conflict.
     */
    @Version
    @Column(name = "version", nullable = false)
    private Long version;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "appointment_id",
            nullable = false,
            unique = true
    )
    private Appointment appointment;

    @Column(name = "patient_id")
    private UUID patientId;

    @Column(name = "department_id", nullable = false)
    private UUID departmentId;

    @Column(name = "patient_name")
    private String patientName;

    @Column(name = "patient_number")
    private String patientNumber;

    private Integer age;

    private String gender;

    @Column(name = "chief_complaint", length = 1000)
    private String chiefComplaint;

    @Column(name = "severity_score", nullable = false)
    private Integer severityScore;

    @Column(name = "severity_label")
    private String severityLabel;

    @Column(name = "scheduled_time", nullable = false)
    private LocalDateTime scheduledTime;

    @Builder.Default
    @Column(name = "current_position", nullable = false)
    private Integer currentPosition = 0;

    @Column(name = "estimated_call_time")
    private LocalDateTime estimatedCallTime;

    @Builder.Default
    @Column(nullable = false)
    private boolean premium = false;

    @Builder.Default
    @Column(name = "is_emergency", nullable = false)
    private boolean emergency = false;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private QueueStatus status = QueueStatus.WAITING;

    /*
     * Used to place a skipped patient behind patients who
     * have not yet been skipped.
     */
    @Column(name = "last_skipped_at")
    private LocalDateTime lastSkippedAt;

    /*
     * Tracks how many times the patient has been skipped.
     */
    @Builder.Default
    @Column(name = "skip_count", nullable = false)
    private Integer skipCount = 0;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void beforeInsert() {
        LocalDateTime now = LocalDateTime.now();

        if (createdAt == null) {
            createdAt = now;
        }

        updatedAt = now;

        populateInformationFromAppointment();

        validateSeverityScore();

        if (severityLabel == null || severityLabel.isBlank()) {
            severityLabel = calculateSeverityLabel(severityScore);
        }

        if (patientNumber == null || patientNumber.isBlank()) {
            patientNumber = generatePatientNumber();
        }

        emergency =
                severityScore != null &&
                severityScore >= 4;

        if (currentPosition == null) {
            currentPosition = 0;
        }

        if (skipCount == null) {
            skipCount = 0;
        }

        if (status == null) {
            status = QueueStatus.WAITING;
        }
    }

    @PreUpdate
    public void beforeUpdate() {
        updatedAt = LocalDateTime.now();

        validateSeverityScore();

        severityLabel =
                calculateSeverityLabel(severityScore);

        emergency =
                severityScore != null &&
                severityScore >= 4;

        if (currentPosition == null) {
            currentPosition = 0;
        }

        if (skipCount == null) {
            skipCount = 0;
        }
    }

    public boolean isEmergency() {
        return emergency;
    }

    public void setEmergency(boolean emergency) {
        this.emergency = emergency;
    }

    public Boolean getIsEmergency() {
        return emergency;
    }

    /**
     * Marks the patient as skipped and returns the patient
     * to the waiting state.
     */
    public void markAsSkipped() {
        this.status = QueueStatus.WAITING;
        this.lastSkippedAt = LocalDateTime.now();
        this.skipCount =
                this.skipCount == null
                        ? 1
                        : this.skipCount + 1;
        this.currentPosition = 0;
        this.estimatedCallTime = null;
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Clears the previous skip marker after the patient
     * progresses through the queue.
     */
    public void clearSkipMarker() {
        this.lastSkippedAt = null;
    }

    private void populateInformationFromAppointment() {
        if (appointment == null) {
            return;
        }

        /*
         * Patient and appointment information is currently
         * supplied by QueueService through the builder.
         */
    }

    private String generatePatientNumber() {
        UUID sourceId =
                patientId != null
                        ? patientId
                        : UUID.randomUUID();

        return "SC-" +
                sourceId.toString()
                        .substring(0, 6)
                        .toUpperCase();
    }

    private void validateSeverityScore() {
        if (severityScore == null) {
            throw new IllegalStateException(
                    "Queue severity score is required."
            );
        }

        if (severityScore < 1 || severityScore > 4) {
            throw new IllegalStateException(
                    "Queue severity score must be between 1 and 4."
            );
        }
    }

    private String calculateSeverityLabel(Integer score) {
        if (score == null) {
            return "MILD";
        }

        return switch (score) {
            case 4 -> "EMERGENCY";
            case 3 -> "SEVERE";
            case 2 -> "MODERATE";
            default -> "MILD";
        };
    }
}