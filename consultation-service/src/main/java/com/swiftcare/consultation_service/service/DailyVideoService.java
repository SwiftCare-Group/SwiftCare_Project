package com.swiftcare.consultation_service.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.HashMap;
import java.util.Map;

@Service
public class DailyVideoService {

    // This reads your API key from application.properties
    @Value("${daily.api.key}")
    private String apiKey;

    // This reads the Daily.co base URL from application.properties
    @Value("${daily.api.url}")
    private String apiUrl;

    /**
     * Creates a new video room on Daily.co
     * Returns the URL of the created room
     *
     * Think of this like calling Daily.co and saying:
     * "Please create a private video room for consultation number 5"
     * Daily.co creates it and gives you back the link
     */
    public String createVideoRoom(Long consultationId) {
        try {
            RestTemplate restTemplate = new RestTemplate();

            // Set up the headers — like writing the "To:" and "From:" on a letter
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey); // This is your API key as a password

            // Set up the room settings
            Map<String, Object> roomSettings = new HashMap<>();
            roomSettings.put("name", "consultation-" + consultationId);
            roomSettings.put("privacy", "private"); // Only people with the link can join

            // Set expiry — room auto-deletes after 24 hours
            Map<String, Object> properties = new HashMap<>();
            properties.put("exp", System.currentTimeMillis() / 1000 + 86400); // 24 hours
            roomSettings.put("properties", properties);

            HttpEntity<Map<String, Object>> request =
                    new HttpEntity<>(roomSettings, headers);

            // Send the request to Daily.co
            ResponseEntity<Map> response = restTemplate.postForEntity(
                    apiUrl + "/rooms",
                    request,
                    Map.class
            );

            // Get the URL from Daily.co's response
            if (response.getStatusCode() == HttpStatus.OK ||
                    response.getStatusCode() == HttpStatus.CREATED) {
                Map<String, Object> body = response.getBody();
                if (body != null && body.containsKey("url")) {
                    return (String) body.get("url");
                }
            }

        } catch (Exception e) {
            System.out.println("Daily.co error: " + e.getMessage());
        }

        // If something goes wrong, return a fallback test URL
        return "https://swiftcare.daily.co/consultation-" + consultationId;
    }
}