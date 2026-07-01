package com.swiftcare.backend.symptom;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "symptom_submissions")
public class SymptomSubmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String patientId;

    @Column(columnDefinition = "TEXT")
    private String symptoms;

    private Integer severityScore;
    private String label;
    private Boolean isEmergency;

    @Column(columnDefinition = "TEXT")
    private String firstAidContent;

    @Column(columnDefinition = "TEXT")
    private String aiRawResponse;

    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }
    public String getSymptoms() { return symptoms; }
    public void setSymptoms(String symptoms) { this.symptoms = symptoms; }
    public Integer getSeverityScore() { return severityScore; }
    public void setSeverityScore(Integer severityScore) { this.severityScore = severityScore; }
    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }
    public Boolean getIsEmergency() { return isEmergency; }
    public void setIsEmergency(Boolean isEmergency) { this.isEmergency = isEmergency; }
    public String getFirstAidContent() { return firstAidContent; }
    public void setFirstAidContent(String firstAidContent) { this.firstAidContent = firstAidContent; }
    public String getAiRawResponse() { return aiRawResponse; }
    public void setAiRawResponse(String aiRawResponse) { this.aiRawResponse = aiRawResponse; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}