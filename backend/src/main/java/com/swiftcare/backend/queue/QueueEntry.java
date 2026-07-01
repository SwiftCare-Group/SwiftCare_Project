package com.swiftcare.backend.queue;

import com.swiftcare.backend.appointment.Appointment;
import com.swiftcare.backend.common.enums.QueueStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "queue_entries")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QueueEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne
    @JoinColumn(name = "appointment_id", nullable = false)
    private Appointment appointment;

    @Column(nullable = false)
    private LocalDateTime joinedAt;

    @Column
    private LocalDateTime estimatedCallTime;

    @Column(nullable = false)
    private int currentPosition;

    @Column(nullable = false)
    private boolean isEmergency;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QueueStatus status;

    @PrePersist
    protected void onCreate() {
        this.joinedAt = LocalDateTime.now();
        this.isEmergency = false;
        this.status = QueueStatus.WAITING;
    }
}