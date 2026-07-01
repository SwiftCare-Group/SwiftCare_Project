package com.swiftcare.backend.symptom;

public class SymptomRequest {
    private String patientId;;
    private String symptoms;
    private String healthProfileSnapshot;

    public String getPatientId() { return patientId; }
    public void setPatientId(String patientId) { this.patientId = patientId; }
    public String getSymptoms() { return symptoms; }
    public void setSymptoms(String symptoms) { this.symptoms = symptoms; }
    public String getHealthProfileSnapshot() { return healthProfileSnapshot; }
    public void setHealthProfileSnapshot(String healthProfileSnapshot) { this.healthProfileSnapshot = healthProfileSnapshot; }
}