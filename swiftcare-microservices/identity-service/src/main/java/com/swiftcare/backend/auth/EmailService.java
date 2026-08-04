package com.swiftcare.backend.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class EmailService {
    private final RestClient.Builder restClientBuilder;
    @Value("${app.gmail.client-id}") private String clientId;
    @Value("${app.gmail.client-secret}") private String clientSecret;
    @Value("${app.gmail.refresh-token}") private String refreshToken;
    @Value("${app.gmail.from-email}") private String fromEmail;
    @Value("${app.password-reset.reset-url}") private String resetUrl;

    public void sendEmailVerificationCode(String recipientEmail, String code, long expiryMinutes) {
        sendEmail(recipientEmail, "Verify your SwiftCare email",
                "Welcome to SwiftCare!\n\nYour email verification code is: " + code +
                "\n\nThis code expires in " + expiryMinutes + " minutes. Do not share it with anyone." +
                "\n\nIf you did not create this account, you can ignore this email.\n\nSwiftCare Team");
    }

    public void sendPasswordResetEmail(String recipientEmail, String token) {
        String link = resetUrl + "?token=" + token;
        sendEmail(recipientEmail, "Reset your SwiftCare password",
                "Hello,\n\nWe received a request to reset your SwiftCare password.\n\nOpen this link to set a new password:\n" +
                link + "\n\nThis link will expire shortly and can only be used once." +
                "\n\nIf you did not request a password reset, you can ignore this email.\n\nSwiftCare Team");
    }

    private void sendEmail(String recipient, String subject, String body) {
        String accessToken = requestAccessToken();
        String mime = "From: SwiftCare <" + sanitizeHeader(fromEmail) + ">\r\n" +
                "To: " + sanitizeHeader(recipient) + "\r\n" +
                "Subject: " + sanitizeHeader(subject) + "\r\n" +
                "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n" +
                "Content-Transfer-Encoding: 8bit\r\n\r\n" + body;
        String raw = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(mime.getBytes(StandardCharsets.UTF_8));
        restClientBuilder.build().post()
                .uri("https://gmail.googleapis.com/gmail/v1/users/me/messages/send")
                .headers(headers -> headers.setBearerAuth(accessToken))
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("raw", raw)).retrieve().toBodilessEntity();
    }

    private String requestAccessToken() {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("refresh_token", refreshToken);
        form.add("grant_type", "refresh_token");
        @SuppressWarnings("unchecked")
        Map<String, Object> response = restClientBuilder.build().post()
                .uri("https://oauth2.googleapis.com/token")
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form).retrieve().body(Map.class);
        Object token = response == null ? null : response.get("access_token");
        if (!(token instanceof String value) || value.isBlank()) {
            throw new IllegalStateException("Google OAuth did not return an access token");
        }
        return value;
    }

    private String sanitizeHeader(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("Gmail sender configuration is incomplete");
        }
        return value.replace("\r", "").replace("\n", "").trim();
    }
}