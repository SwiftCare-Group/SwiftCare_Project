package com.swiftcare.backend.symptom;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.MediaType;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@RestController
@RequestMapping("/api/v1/symptoms")
@CrossOrigin(origins = "*")
public class SymptomController {

    @Autowired
    private SymptomSubmissionRepository repository;

    @Value("${AI_API_KEY:}")
    private String claudeApiKey;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostMapping("/submit")
    public ResponseEntity<?> submit(@RequestBody SymptomRequest request) {
        try {
            if (request.getPatientId() == null || request.getSymptoms() == null
                    || request.getSymptoms().isBlank()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "patientId and symptoms are required"));
            }

            AIResult aiResult = classifyWithClaude(request.getSymptoms());

            SymptomSubmission submission = new SymptomSubmission();
            submission.setPatientId(UUID.fromString(request.getPatientId()));
            submission.setSymptoms(request.getSymptoms());
            submission.setSeverityScore(aiResult.severityScore());
            submission.setLabel(aiResult.label());
            submission.setIsEmergency(aiResult.isEmergency());
            submission.setFirstAidContent(aiResult.firstAidContent());

            SymptomSubmission saved = repository.save(submission);
            return ResponseEntity.ok(saved);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage(), "cause", e.getClass().getName()));
        }
    }

    private AIResult classifyWithClaude(String symptoms) {
        if (claudeApiKey == null || claudeApiKey.isBlank()) {
            System.out.println("No Claude API key — using fallback");
            return new AIResult(50, "MODERATE", false,
                    "Rest and monitor your condition. Seek medical advice if symptoms worsen.");
        }
        try {
            OkHttpClient client = new OkHttpClient.Builder()
                    .callTimeout(45, TimeUnit.SECONDS)
                    .build();

            String prompt = "A patient reports: " + symptoms + "\\n\\n" +
                    "Respond ONLY with valid JSON, no other text:\\n" +
                    "{\\\"severityScore\\\": 0-100, \\\"label\\\": \\\"MILD|MODERATE|SEVERE|CRITICAL\\\", " +
                    "\\\"isEmergency\\\": true/false, \\\"firstAidContent\\\": \\\"advice here\\\"}";

            String body = "{\"model\":\"claude-sonnet-4-6\",\"max_tokens\":300," +
                    "\"messages\":[{\"role\":\"user\",\"content\":\"" + prompt + "\"}]}";

            Request httpRequest = new Request.Builder()
                    .url("https://api.anthropic.com/v1/messages")
                    .addHeader("x-api-key", claudeApiKey)
                    .addHeader("anthropic-version", "2023-06-01")
                    .addHeader("content-type", "application/json")
                    .post(okhttp3.RequestBody.create(body, MediaType.get("application/json")))
                    .build();

            try (Response response = client.newCall(httpRequest).execute()) {
                String raw = response.body().string();
                JsonNode envelope = objectMapper.readTree(raw);
                String text = envelope.path("content").get(0).path("text").asText();
                JsonNode result = objectMapper.readTree(text.trim());

                return new AIResult(
                        result.path("severityScore").asInt(50),
                        result.path("label").asText("MODERATE"),
                        result.path("isEmergency").asBoolean(false),
                        result.path("firstAidContent").asText("Rest and monitor your condition.")
                );
            }
        } catch (Exception e) {
            System.err.println("Claude API failed: " + e.getMessage());
            return new AIResult(50, "MODERATE", false,
                    "Could not analyse symptoms. Please see a doctor if concerned.");
        }
    }

    record AIResult(int severityScore, String label, boolean isEmergency, String firstAidContent) {}

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
                repository.findByPatientIdOrderByCreatedAtDesc(UUID.fromString(patientId))
        );
    }
}