package com.swiftcare.backend.healthprofile;

import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import com.swiftcare.backend.healthprofile.dto.HealthProfileRequest;
import com.swiftcare.backend.healthprofile.dto.HealthProfileResponse;
import com.swiftcare.backend.patient.Patient;
import com.swiftcare.backend.patient.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class HealthProfileService {

    private final HealthProfileRepository healthProfileRepository;
    private final PatientRepository patientRepository;

    public HealthProfileResponse createProfile(UUID patientId, HealthProfileRequest request) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));

        if (healthProfileRepository.existsByPatientId(patientId)) {
            throw new IllegalStateException("Health profile already exists for this patient");
        }

        HealthProfile profile = HealthProfile.builder()
                .patient(patient)
                .conditions(request.getConditions())
                .chronicIllnesses(request.getChronicIllnesses())
                .knownDiagnoses(request.getKnownDiagnoses())
                .build();

        HealthProfile saved = healthProfileRepository.save(profile);
        return mapToResponse(saved);
    }

    public HealthProfileResponse getProfile(UUID patientId) {
        HealthProfile profile = healthProfileRepository.findByPatientId(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Health profile not found"));

        return mapToResponse(profile);
    }

    public HealthProfileResponse updateProfile(UUID patientId, HealthProfileRequest request) {
        HealthProfile profile = healthProfileRepository.findByPatientId(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Health profile not found"));

        profile.setConditions(request.getConditions());
        profile.setChronicIllnesses(request.getChronicIllnesses());
        profile.setKnownDiagnoses(request.getKnownDiagnoses());

        HealthProfile updated = healthProfileRepository.save(profile);
        return mapToResponse(updated);
    }

    private HealthProfileResponse mapToResponse(HealthProfile profile) {
        return HealthProfileResponse.builder()
                .id(profile.getId())
                .patientId(profile.getPatient().getId())
                .conditions(profile.getConditions())
                .chronicIllnesses(profile.getChronicIllnesses())
                .knownDiagnoses(profile.getKnownDiagnoses())
                .updatedAt(profile.getUpdatedAt())
                .build();
    }
}