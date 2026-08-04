package com.swiftcare.backend.auth;

import com.swiftcare.backend.patient.Patient;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "email_verification_tokens")
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class EmailVerificationToken {
    @Id private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;
    @Column(name = "code_hash", nullable = false) private String codeHash;
    @Column(name = "expires_at", nullable = false) private LocalDateTime expiresAt;
    @Column(nullable = false) private boolean used;
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;
    public boolean isExpired() { return expiresAt.isBefore(LocalDateTime.now()); }
}
