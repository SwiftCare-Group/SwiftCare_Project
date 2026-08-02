package com.swiftcare.backend.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String fromEmail;

    @Value("${app.mail.sender-name:SwiftCare}")
    private String senderName;

    @Value("${app.password-reset.reset-url}")
    private String resetUrl;

    public void sendPasswordResetEmail(String recipientEmail, String token) {
        String link = resetUrl + "?token=" + token;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(senderName + " <" + fromEmail + ">");
        message.setTo(recipientEmail);
        message.setSubject("Reset your SwiftCare password");
        message.setText(
                "Hello,\n\n" +
                "We received a request to reset your SwiftCare password.\n\n" +
                "Open this link to set a new password:\n" +
                link + "\n\n" +
                "This link will expire shortly and can only be used once.\n\n" +
                "If you did not request a password reset, you can ignore this email.\n\n" +
                "SwiftCare Team"
        );

        mailSender.send(message);
    }
}