package com.swiftcare.backend.healthprofile;

import com.swiftcare.backend.patient.Patient;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "health_profiles")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HealthProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne
    @JoinColumn(name = "patient_id", nullable = false, unique = true)
    private Patient patient;

    @ElementCollection
    @CollectionTable(name = "health_profile_conditions",
            joinColumns = @JoinColumn(name = "profile_id"))
    @Column(name = "condition")
    private List<String> conditions;

    @ElementCollection
    @CollectionTable(name = "health_profile_illnesses",
            joinColumns = @JoinColumn(name = "profile_id"))
    @Column(name = "illness")
    private List<String> chronicIllnesses;

    @ElementCollection
    @CollectionTable(name = "health_profile_diagnoses",
            joinColumns = @JoinColumn(name = "profile_id"))
    @Column(name = "diagnosis")
    private List<String> knownDiagnoses;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}