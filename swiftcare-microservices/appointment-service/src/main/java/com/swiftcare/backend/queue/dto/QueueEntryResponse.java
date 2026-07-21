package com.swiftcare.backend.queue.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class QueueEntryResponse {

    private UUID id;
    private UUID patientId;
    private UUID departmentId;

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