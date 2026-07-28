package com.swiftcare.backend.auth;

import com.swiftcare.backend.consultation.Doctor;
import com.swiftcare.backend.patient.Patient;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "refresh_tokens")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id")
    private Patient patient;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "doctor_id")
    private Doctor doctor;

    @Column(nullable = false, unique = true)
    private String token;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    private boolean revoked;

    @PrePersist
    protected void onCreate() {
        if (patient == null && doctor == null) {
            throw new IllegalStateException(
                    "Refresh token must belong to a patient or staff account"
            );
        }

        if (patient != null && doctor != null) {
            throw new IllegalStateException(
                    "Refresh token cannot have multiple owners"
            );
        }

        revoked = false;

        if (expiresAt == null) {
            expiresAt = LocalDateTime.now().plusDays(30);
        }
    }
}
