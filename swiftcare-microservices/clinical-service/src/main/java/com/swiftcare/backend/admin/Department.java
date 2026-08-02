package com.swiftcare.backend.admin;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Entity
@Table(name = "departments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Department {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hospital_id", nullable = false)
    private Hospital hospital;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String operatingHours;

    @Column(nullable = false)
    private int queueCapacity;

    @Column(nullable = false)
    private boolean isActive;

    @PrePersist
    protected void onCreate() {
        this.isActive = true;
    }
}