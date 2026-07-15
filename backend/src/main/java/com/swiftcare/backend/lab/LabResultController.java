package com.swiftcare.backend.lab;

import com.swiftcare.backend.patient.Patient;
import com.swiftcare.backend.patient.PatientRepository;
import lombok.RequiredArgsConstructor;
import com.swiftcare.backend.common.exception.ResourceNotFoundException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/lab-results")
@RequiredArgsConstructor
public class LabResultController {

    private final LabResultRepository labResultRepository;

    private final PatientRepository patientRepository;


    @GetMapping("/my")
    public List<LabResult> getMyResults(
            @AuthenticationPrincipal String email
    ) {

        Patient patient =
                patientRepository.findByEmail(email)
               .orElseThrow(() ->
        new ResourceNotFoundException(
                "Patient not found"
        )
);


        return labResultRepository
                .findByPatientOrderByPerformedAtDesc(
                        patient
                );
    }
}