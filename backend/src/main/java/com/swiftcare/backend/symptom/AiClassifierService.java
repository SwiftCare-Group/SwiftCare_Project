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
                "model", model,
                "max_tokens", 500,
                "messages", new Object[]{
                        Map.of("role", "user", "content", prompt)
                }
        );

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://api.anthropic.com/v1/messages"))
                .header("Content-Type", "application/json")
                .header("x-api-key", apiKey)
                .header("anthropic-version", "2023-06-01")
                .POST(HttpRequest.BodyPublishers.ofString(
                        objectMapper.writeValueAsString(requestBody)))
                .build();

        HttpResponse<String> response = client.send(request,
                HttpResponse.BodyHandlers.ofString());

        return parseResponse(response.body());
    }

    private String buildPrompt(String symptoms, String healthProfile) {
        return """
                You are an emergency medical triage AI. Your job is to assess symptom severity ACCURATELY.
                
                SEVERITY SCALE:
                - MILD (1-3): Minor symptoms, no immediate danger. Examples: mild headache, slight cold, minor cuts.
                - MODERATE (4-6): Significant symptoms needing medical attention soon. Examples: high fever, moderate pain, persistent vomiting.
                - SEVERE (7-8): Serious symptoms requiring urgent care. Examples: severe chest pain, difficulty breathing, high fever with confusion.
                - CRITICAL (9-10): Life-threatening emergency. Examples: unconsciousness, severe difficulty breathing, heart attack symptoms, stroke.
                
                Patient Symptoms: %s
                Patient Health Profile: %s
                
                IMPORTANT: "difficulty breathing" and "unconscious" are CRITICAL symptoms. Score them 9-10.
                
                Respond ONLY with valid JSON, no markdown, no explanation:
                {
                "severityScore": <integer 1-10>,
                "severityLabel": <"MILD" | "MODERATE" | "SEVERE" | "CRITICAL">,
                "isEmergency": <true | false>,
                "firstAidContent": "<detailed first aid instructions if SEVERE or CRITICAL, empty string if MILD or MODERATE>"
                }
                """.formatted(symptoms, healthProfile);
    }

    private AiClassificationResult parseResponse(String responseBody) throws Exception {
        JsonNode root = objectMapper.readTree(responseBody);
        
        // Claude API returns content as array of objects with type and text
        JsonNode contentArray = root.path("content");
        if (contentArray.isEmpty()) {
            throw new Exception("Empty response from AI");
        }
        
        String content = contentArray.get(0).path("text").asText();
        
        // Extract JSON from the response — Claude sometimes wraps it in markdown
        content = content.trim();
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