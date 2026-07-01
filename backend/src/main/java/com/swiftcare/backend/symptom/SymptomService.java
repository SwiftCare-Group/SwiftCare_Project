package com.swiftcare.backend.symptom;

import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.healthprofile.HealthProfile;
import com.swiftcare.backend.healthprofile.HealthProfileRepository;
import com.swiftcare.backend.patient.Patient;
import com.swiftcare.backend.patient.PatientRepository;
import com.swiftcare.backend.symptom.dto.FirstAidResponse;
import com.swiftcare.backend.symptom.dto.SymptomResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SymptomService {

    private final SymptomSubmissionRepository symptomSubmissionRepository;
    private final PatientRepository patientRepository;
    private final HealthProfileRepository healthProfileRepository;
    private final AiClassifierService aiClassifierService;

    public SymptomResponse submitSymptoms(UUID patientId, SymptomRequest request) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));

        String healthProfileSnapshot = buildHealthProfileSnapshot(patientId);

        AiClassificationResult result;
        try {
            result = aiClassifierService.classify(request.getSymptoms(), healthProfileSnapshot);
        } catch (Exception e) {
            log.error("AI classification failed: {}", e.getMessage());
            result = AiClassificationResult.builder()
                    .severityScore(3)
                    .severityLabel("MILD")
                    .isEmergency(false)
                    .firstAidContent("")
                    .build();
        }

        SymptomSubmission submission = SymptomSubmission.builder()
                .patient(patient)
                .symptoms(request.getSymptoms())
                .severityScore(result.getSeverityScore())
                .severityLabel(result.getSeverityLabel())
                .isEmergency(result.isEmergency())
                .firstAidContent(result.getFirstAidContent())
                .aiRawResponse(result.toString())
                .build();

        SymptomSubmission saved = symptomSubmissionRepository.save(submission);
        return mapToResponse(saved);
    }

    public SymptomResponse getSubmission(UUID submissionId) {
        SymptomSubmission submission = symptomSubmissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found"));
        return mapToResponse(submission);
    }

    public FirstAidResponse getFirstAid(UUID submissionId) {
        SymptomSubmission submission = symptomSubmissionRepository.findById(submissionId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found"));

        return FirstAidResponse.builder()
                .severityLabel(submission.getSeverityLabel())
                .isEmergency(submission.getIsEmergency())
                .firstAidContent(submission.getFirstAidContent())
                .build();
    }

    private String buildHealthProfileSnapshot(UUID patientId) {
        return healthProfileRepository.findByPatientId(patientId)
                .map(profile -> String.format(
                        "Conditions: %s. Chronic Illnesses: %s. Known Diagnoses: %s.",
                        profile.getConditions(),
                        profile.getChronicIllnesses(),
                        profile.getKnownDiagnoses()))
                .orElse("No health profile available.");
    }

    private SymptomResponse mapToResponse(SymptomSubmission submission) {
        return SymptomResponse.builder()
                .id(submission.getId())
                .patientId(submission.getPatient().getId())
                .symptoms(submission.getSymptoms())
                .severityScore(submission.getSeverityScore())
                .severityLabel(submission.getSeverityLabel())
                .isEmergency(submission.getIsEmergency())
                .firstAidContent(submission.getFirstAidContent())
                .createdAt(submission.getCreatedAt())
                .build();
    }
}