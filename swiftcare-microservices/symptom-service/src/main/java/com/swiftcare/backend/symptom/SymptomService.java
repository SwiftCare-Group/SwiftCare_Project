package com.swiftcare.backend.symptom;

import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.healthprofile.HealthProfileRepository;
import com.swiftcare.backend.patient.Patient;
import com.swiftcare.backend.patient.PatientRepository;
import com.swiftcare.backend.symptom.dto.FirstAidResponse;
import com.swiftcare.backend.symptom.dto.SymptomResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SymptomService {

    private static final String DEFAULT_EMERGENCY_FIRST_AID =
            "Seek emergency medical help immediately. Stay with the patient, "
                    + "keep them calm, and monitor their breathing until help arrives.";

    private final SymptomSubmissionRepository symptomSubmissionRepository;
    private final PatientRepository patientRepository;
    private final HealthProfileRepository healthProfileRepository;
    private final AiClassifierService aiClassifierService;

    @Transactional
    public SymptomResponse submitSymptoms(
            UUID patientId,
            SymptomRequest request
    ) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Patient not found")
                );

        String symptoms = request.getSymptoms().trim();
        int patientSeverityScore =
                validatePatientSeverity(request.getSeverityScore());

        String healthProfileSnapshot =
                buildHealthProfileSnapshot(patientId);

        AiClassificationResult aiResult;
        String aiStatus;

        try {
            aiResult = aiClassifierService.classify(
                    symptoms,
                    healthProfileSnapshot
            );
            aiResult = normalizeSeverity(aiResult);
            aiStatus = "COMPLETED";
        } catch (Exception exception) {
            /*
             * AI failure must never prevent the patient's symptoms from
             * being stored and used for an appointment.
             */
            log.warn(
                    "AI classification failed for patient {}. "
                            + "Using rule-based fallback.",
                    patientId,
                    exception
            );

            aiResult = ruleBasedClassify(symptoms);
            aiStatus = "FALLBACK";
        }

        int aiRecommendedSeverityScore =
                aiResult.getSeverityScore();

        boolean isEmergency =
                patientSeverityScore == 4
                        || aiRecommendedSeverityScore == 4
                        || aiResult.isEmergency();

        String firstAidContent =
                normaliseFirstAid(aiResult.getFirstAidContent(), isEmergency);

        SymptomSubmission submission = SymptomSubmission.builder()
                .patient(patient)
                .symptoms(symptoms)
                .severityScore(patientSeverityScore)
                .severityLabel(labelForSeverity(patientSeverityScore))
                .aiRecommendedSeverityScore(aiRecommendedSeverityScore)
                .aiStatus(aiStatus)
                .isEmergency(isEmergency)
                .firstAidContent(firstAidContent)
                .aiRawResponse(String.valueOf(aiResult))
                .build();

        return mapToResponse(
                symptomSubmissionRepository.save(submission)
        );
    }

    @Transactional(readOnly = true)
    public SymptomResponse getSubmission(UUID submissionId) {
        SymptomSubmission submission =
                symptomSubmissionRepository.findById(submissionId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Submission not found"
                                )
                        );

        return mapToResponse(submission);
    }

    @Transactional(readOnly = true)
    public FirstAidResponse getFirstAid(UUID submissionId) {
        SymptomSubmission submission =
                symptomSubmissionRepository.findById(submissionId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Submission not found"
                                )
                        );

        return FirstAidResponse.builder()
                .severityLabel(submission.getSeverityLabel())
                .isEmergency(submission.getIsEmergency())
                .firstAidContent(submission.getFirstAidContent())
                .build();
    }

    private String buildHealthProfileSnapshot(UUID patientId) {
        return healthProfileRepository.findByPatientId(patientId)
                .map(profile -> String.format(
                        "Conditions: %s. Chronic Illnesses: %s. "
                                + "Known Diagnoses: %s.",
                        profile.getConditions(),
                        profile.getChronicIllnesses(),
                        profile.getKnownDiagnoses()
                ))
                .orElse("No health profile available.");
    }

    private SymptomResponse mapToResponse(
            SymptomSubmission submission
    ) {
        return SymptomResponse.builder()
                .id(submission.getId())
                .patientId(submission.getPatient().getId())
                .symptoms(submission.getSymptoms())
                .severityScore(submission.getSeverityScore())
                .severityLabel(submission.getSeverityLabel())
                .aiRecommendedSeverityScore(
                        submission.getAiRecommendedSeverityScore()
                )
                .aiStatus(submission.getAiStatus())
                .isEmergency(submission.getIsEmergency())
                .firstAidContent(submission.getFirstAidContent())
                .createdAt(submission.getCreatedAt())
                .build();
    }

    private int validatePatientSeverity(Integer severityScore) {
        if (severityScore == null
                || severityScore < 1
                || severityScore > 4) {
            throw new IllegalArgumentException(
                    "Severity score must be between 1 and 4"
            );
        }

        return severityScore;
    }

    private String labelForSeverity(int severityScore) {
        return switch (severityScore) {
            case 4 -> "EMERGENCY";
            case 3 -> "SEVERE";
            case 2 -> "MODERATE";
            default -> "MILD";
        };
    }

    private String normaliseFirstAid(
            String firstAidContent,
            boolean isEmergency
    ) {
        if (firstAidContent != null
                && !firstAidContent.isBlank()) {
            return firstAidContent.trim();
        }

        return isEmergency ? DEFAULT_EMERGENCY_FIRST_AID : "";
    }

    private AiClassificationResult ruleBasedClassify(
            String symptoms
    ) {
        String value = symptoms.toLowerCase(Locale.ROOT);

        if (value.contains("unconscious")
                || value.contains("not breathing")
                || value.contains("heart attack")
                || value.contains("stroke")
                || value.contains("severe bleeding")
                || value.contains("unresponsive")) {

            return AiClassificationResult.builder()
                    .severityScore(4)
                    .severityLabel("EMERGENCY")
                    .isEmergency(true)
                    .firstAidContent(
                            "Call emergency services immediately. "
                                    + "Keep the patient still and monitor "
                                    + "breathing. Do not leave them alone."
                    )
                    .build();
        }

        if (value.contains("difficulty breathing")
                || value.contains("chest pain")
                || value.contains("severe pain")
                || value.contains("high fever")
                || value.contains("vomiting blood")
                || value.contains("can't breathe")) {

            return AiClassificationResult.builder()
                    .severityScore(3)
                    .severityLabel("SEVERE")
                    .isEmergency(false)
                    .firstAidContent(
                            "Seek urgent medical attention. "
                                    + "Sit upright if having breathing "
                                    + "difficulty. Stay calm and avoid exertion."
                    )
                    .build();
        }

        if (value.contains("fever")
                || value.contains("vomiting")
                || value.contains("moderate pain")
                || value.contains("persistent")
                || value.contains("dizziness")
                || value.contains("headache")) {

            return AiClassificationResult.builder()
                    .severityScore(2)
                    .severityLabel("MODERATE")
                    .isEmergency(false)
                    .firstAidContent("")
                    .build();
        }

        return AiClassificationResult.builder()
                .severityScore(1)
                .severityLabel("MILD")
                .isEmergency(false)
                .firstAidContent("")
                .build();
    }

    private AiClassificationResult normalizeSeverity(
            AiClassificationResult result
    ) {
        if (result == null) {
            return ruleBasedClassify("");
        }

        int normalizedScore =
                scoreFromLabel(result.getSeverityLabel());

        if (normalizedScore == 0) {
            int rawScore = result.getSeverityScore();

            if (rawScore >= 1 && rawScore <= 4) {
                normalizedScore = rawScore;
            } else if (rawScore <= 2) {
                normalizedScore = 1;
            } else if (rawScore <= 5) {
                normalizedScore = 2;
            } else if (rawScore <= 8) {
                normalizedScore = 3;
            } else {
                normalizedScore = 4;
            }
        }

        return AiClassificationResult.builder()
                .severityScore(normalizedScore)
                .severityLabel(labelForSeverity(normalizedScore))
                .isEmergency(
                        normalizedScore == 4 || result.isEmergency()
                )
                .firstAidContent(result.getFirstAidContent())
                .build();
    }

    private int scoreFromLabel(String severityLabel) {
        if (severityLabel == null || severityLabel.isBlank()) {
            return 0;
        }

        return switch (
                severityLabel.trim().toUpperCase(Locale.ROOT)
        ) {
            case "MILD", "LOW" -> 1;
            case "MODERATE", "MEDIUM" -> 2;
            case "SEVERE", "HIGH" -> 3;
            case "EMERGENCY", "CRITICAL" -> 4;
            default -> 0;
        };
    }
}