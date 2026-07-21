package com.swiftcare.backend.consultation;

import com.swiftcare.backend.admin.Department;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.swiftcare.backend.common.enums.Role;

import java.util.UUID;

@Entity
@Table(name = "doctors")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Doctor {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String licenseNo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @Column(nullable = false)
    private boolean isAvailableOnline;

    @Column(nullable = false)
    private boolean isDeleted;

    @PrePersist
    protected void onCreate() {
        this.isAvailableOnline = true;
        this.isDeleted = false;
        if (this.role == null) {
            this.role = Role.DOCTOR;
        }
    }

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;
}