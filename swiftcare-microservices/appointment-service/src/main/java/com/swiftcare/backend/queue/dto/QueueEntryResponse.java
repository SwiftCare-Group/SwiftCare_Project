package com.swiftcare.backend.queue.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QueueEntryResponse {

    private UUID id;
    private UUID patientId;
    private UUID departmentId;

    private UUID appointmentId;
    private UUID symptomAssessmentId;

    private String patientName;
    private String patientNumber;

    private Integer age;
    private String gender;

    private String chiefComplaint;

    private Integer severityScore;
    private String severityLabel;

    private LocalDateTime scheduledTime;

    private Integer currentPosition;
    private LocalDateTime estimatedCallTime;

    private boolean premium;
    private boolean emergency;

    private String status;
}