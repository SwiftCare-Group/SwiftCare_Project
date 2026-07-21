package com.swiftcare.backend.queue;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
@AllArgsConstructor
public class DoctorQueueResponse {

    private UUID id;

    private UUID patientId;

    private String patientName;

    private String patientNumber;

    private Integer age;

    private String gender;

    private String chiefComplaint;

    private Integer severityScore;

    private String severityLabel;

    private LocalDateTime scheduledTime;

    private Integer queuePosition;

    private Integer estimatedWaitMinutes;

    private String status;

    private Boolean isEmergency;

    private Boolean premium;
}