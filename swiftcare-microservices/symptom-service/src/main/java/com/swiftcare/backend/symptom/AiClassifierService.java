package com.swiftcare.backend.symptom;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiClassifierService {

    @Value("${ai.api-key}")
    private String apiKey;

    @Value("${ai.model}")
    private String model;

    private final ObjectMapper objectMapper;

    public AiClassificationResult classify(String symptoms, String healthProfile) throws Exception {
        String prompt = buildPrompt(symptoms, healthProfile);

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", prompt)
                        ))
                ),
                "generationConfig", Map.of(
                        "temperature", 0.1,
                        "maxOutputTokens", 500
                )
        );

        String url = "https://generativelanguage.googleapis.com/v1beta/models/"
                + model + ":generateContent?key=" + apiKey;

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(
                        objectMapper.writeValueAsString(requestBody)))
                .build();

        HttpResponse<String> response = client.send(request,
                HttpResponse.BodyHandlers.ofString());

        log.info("Gemini response: {}", response.body());
        return parseResponse(response.body());
    }

    private String buildPrompt(String symptoms, String healthProfile) {
        return """
                You are an emergency medical triage AI. Assess symptom severity ACCURATELY.
                
                SEVERITY SCALE:
                - MILD (1-3): Minor symptoms, no immediate danger. Examples: mild headache, slight cold.
                - MODERATE (4-6): Significant symptoms needing attention soon. Examples: high fever, moderate pain.
                - SEVERE (7-8): Serious symptoms requiring urgent care. Examples: severe chest pain, difficulty breathing.
                - CRITICAL (9-10): Life-threatening emergency. Examples: unconsciousness, heart attack, stroke symptoms.
                
                IMPORTANT RULES:
                - "difficulty breathing" = SEVERE or CRITICAL, score 7-10
                - "unconscious" or "unconsciousness" = CRITICAL, score 9-10, isEmergency: true
                - "chest pain" = SEVERE, score 7-8
                - "mild headache" or "slight cold" = MILD, score 1-3
                
                Patient Symptoms: %s
                Patient Health Profile: %s
                
                Respond ONLY with this exact JSON, no markdown, no explanation:
                {"severityScore": <1-10>, "severityLabel": "<MILD|MODERATE|SEVERE|CRITICAL>", "isEmergency": <true|false>, "firstAidContent": "<instructions if SEVERE/CRITICAL, empty string otherwise>"}
                """.formatted(symptoms, healthProfile);
    }

    private AiClassificationResult parseResponse(String responseBody) throws Exception {
        JsonNode root = objectMapper.readTree(responseBody);

        if (root.has("error")) {
            throw new Exception("AI API error: " + root.path("error").path("message").asText());
        }

        // Gemini format: candidates[0].content.parts[0].text
        String content = root.path("candidates")
                .get(0)
                .path("content")
                .path("parts")
                .get(0)
                .path("text")
                .asText()
                .trim();

        log.info("AI content response: {}", content);

        // Strip markdown if present
        if (content.contains("```json")) {
            content = content.substring(content.indexOf("```json") + 7);
            content = content.substring(0, content.indexOf("```"));
        } else if (content.contains("```")) {
            content = content.substring(content.indexOf("```") + 3);
            content = content.substring(0, content.indexOf("```"));
        }
        content = content.trim();

        JsonNode result = objectMapper.readTree(content);

        return AiClassificationResult.builder()
                .severityScore(result.path("severityScore").asInt())
                .severityLabel(result.path("severityLabel").asText())
                .isEmergency(result.path("isEmergency").asBoolean())
                .firstAidContent(result.path("firstAidContent").asText())
                .build();
    }
}