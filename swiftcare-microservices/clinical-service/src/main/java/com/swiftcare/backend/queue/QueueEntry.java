package com.swiftcare.backend.queue;

import com.swiftcare.backend.appointment.Appointment;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;
import com.swiftcare.backend.common.enums.QueueStatus;

@Entity
@Table(name = "queue_entries")
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
     * Required by the existing AppointmentService:
     *
     * QueueEntry.builder()
     *     .appointment(saved)
     *     ...
     */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "appointment_id",
            nullable = false,
            unique = true
    )
    private Appointment appointment;

    /*
     * Optional copied patient details used by the doctor's queue.
     */
    @Column(name = "patient_id")
    private UUID patientId;

    @Column(name = "department_id")
    private UUID departmentId;

    @Column(name = "patient_name")
    private String patientName;

    @Column(name = "patient_number")
    private String patientNumber;

    private Integer age;

    private String gender;

    @Column(name = "chief_complaint", length = 1000)
    private String chiefComplaint;

    @Column(name = "severity_score")
    private Integer severityScore;

    @Column(name = "severity_label")
    private String severityLabel;

    @Column(name = "scheduled_time")
    private LocalDateTime scheduledTime;

    /*
     * Required by the existing AppointmentService.
     */
    @Builder.Default
    @Column(name = "current_position", nullable = false)
    private Integer currentPosition = 0;

    /*
     * Required by the existing AppointmentService.
     */
    @Column(name = "estimated_call_time")
    private LocalDateTime estimatedCallTime;

    @Builder.Default
    @Column(nullable = false)
    private boolean premium = false;

    /*
     * Primitive boolean generates isEmergency(), which your
     * AppointmentService currently calls.
     */
    @Builder.Default
    @Column(name = "is_emergency", nullable = false)
    private boolean emergency = false;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QueueStatus status = QueueStatus.WAITING;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void beforeInsert() {
        LocalDateTime now = LocalDateTime.now();

        if (createdAt == null) {
            createdAt = now;
        }

        updatedAt = now;

        populateInformationFromAppointment();

        if (severityLabel == null || severityLabel.isBlank()) {
            severityLabel = calculateSeverityLabel(severityScore);
        }

        if (patientNumber == null || patientNumber.isBlank()) {
            patientNumber = generatePatientNumber();
        }

        if (severityScore != null && severityScore >= 4) {
            emergency = true;
        }

        if (currentPosition == null) {
            currentPosition = 0;
        }

        if (status == null) {
            status = QueueStatus.WAITING;
        }
    }

    @PreUpdate
    public void beforeUpdate() {
        updatedAt = LocalDateTime.now();

        if (severityLabel == null || severityLabel.isBlank()) {
            severityLabel = calculateSeverityLabel(severityScore);
        }

        if (severityScore != null && severityScore >= 4) {
            emergency = true;
        }
    }

    /*
     * Lombok generates isEmergency() only when the actual field is
     * named emergency. This explicit method also guarantees compatibility
     * with your existing AppointmentService.
     */
    public boolean isEmergency() {
        return emergency;
    }

    /*
     * This setter lets code continue using setEmergency(...).
     */
    public void setEmergency(boolean emergency) {
        this.emergency = emergency;
    }

    /*
     * The rewritten QueueService used getIsEmergency().
     * Keep this compatibility method too.
     */
    public Boolean getIsEmergency() {
        return emergency;
    }

    private void populateInformationFromAppointment() {
        if (appointment == null) {
            return;
        }

        /*
         * Keep this method minimal until we inspect the exact fields
         * available inside your Appointment entity.
         *
         * AppointmentService can still set values directly through
         * the QueueEntry builder.
         */
    }

    private String generatePatientNumber() {
        UUID sourceId = patientId;

        if (sourceId == null) {
            sourceId = UUID.randomUUID();
        }

        return "SC-" +
                sourceId.toString()
                        .substring(0, 6)
                        .toUpperCase();
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