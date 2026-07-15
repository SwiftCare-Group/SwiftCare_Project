package com.swiftcare.backend.lab;

import com.swiftcare.backend.patient.Patient;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "lab_results")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;


    @Column(nullable = false)
    private String testName;


    @Column(columnDefinition = "TEXT")
    private String result;


    @Column(nullable = false)
    private String status;


    private String doctorName;


    @Column(columnDefinition = "TEXT")
    private String notes;


    @Column(nullable = false)
    private LocalDateTime performedAt;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
        name = "patient_id",
        nullable = false
    )
    private Patient patient;
}