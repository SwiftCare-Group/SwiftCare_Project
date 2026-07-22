package com.swiftcare.consultation_service.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import jakarta.persistence.Column;

@Entity
@Table(name = "prescriptions")
public class Prescription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long consultationId;  // Which consultation created this prescription?
    private Long patientId;       // Who is this prescription for?
    private Long doctorId;        // Which doctor wrote it?

    @Column(columnDefinition = "TEXT")
    private String qrCodeData;   // The actual QR code content
    private String status;        // ACTIVE, FULLY_DISPENSED, PARTIALLY_DISPENSED

    private LocalDateTime issuedAt;   // When was it created?
    private LocalDateTime expiresAt;  // When does it expire?

    // Getters and Setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getConsultationId() { return consultationId; }
    public void setConsultationId(Long consultationId) { this.consultationId = consultationId; }

    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }

    public Long getDoctorId() { return doctorId; }
    public void setDoctorId(Long doctorId) { this.doctorId = doctorId; }

    public String getQrCodeData() { return qrCodeData; }
    public void setQrCodeData(String qrCodeData) { this.qrCodeData = qrCodeData; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getIssuedAt() { return issuedAt; }
    public void setIssuedAt(LocalDateTime issuedAt) { this.issuedAt = issuedAt; }

    public LocalDateTime getExpiresAt() { return expiresAt; }
    public void setExpiresAt(LocalDateTime expiresAt) { this.expiresAt = expiresAt; }
}