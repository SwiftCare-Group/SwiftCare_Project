package com.swiftcare.backend.symptom;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/symptoms")
@CrossOrigin(origins = "*")
public class SymptomController {

    @Autowired
    private SymptomSubmissionRepository repository;

    @PostMapping("/submit")
    public ResponseEntity<?> submit(@RequestBody SymptomRequest request) {
        try {
            if (request.getPatientId() == null || request.getSymptoms() == null
                    || request.getSymptoms().isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "pat gbientId and symptoms are required"));
            }
            SymptomSubmission submission = new SymptomSubmission();
            submission.setPatientId(java.util.UUID.fromString(request.getPatientId()));
            submission.setSymptoms(request.getSymptoms());
            submission.setSeverityScore(75);
            submission.setLabel("SEVERE");
            submission.setIsEmergency(false);
            submission.setFirstAidContent("Rest and monitor your condition.");
            SymptomSubmission saved = repository.save(submission);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage(), "cause", e.getClass().getName()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/firstaid")
    public ResponseEntity<?> getFirstAid(@PathVariable Long id) {
        return repository.findById(id)
                .map(s -> ResponseEntity.ok(Map.of(
                        "firstAidContent", s.getFirstAidContent(),
                        "label", s.getLabel()
                )))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<SymptomSubmission>> getByPatient(@PathVariable String patientId) {
        return ResponseEntity.ok(
                repository.findByPatientIdOrderByCreatedAtDesc(java.util.UUID.fromString(patientId))
        );
    }
}