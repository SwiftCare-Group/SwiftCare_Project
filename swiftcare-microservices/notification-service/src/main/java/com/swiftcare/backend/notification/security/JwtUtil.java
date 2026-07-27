package com.swiftcare.backend.notification.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {

    private static final Logger logger =
            LoggerFactory.getLogger(JwtUtil.class);

    @Value("${app.jwt.secret}")
    private String secret;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(
                secret.getBytes(StandardCharsets.UTF_8)
        );
    }

    public String extractEmail(String token) {
        return parseClaims(token).getSubject();
    }

    public String extractRole(String token) {
        return parseClaims(token).get("role", String.class);
    }

    public String extractTier(String token) {
        return parseClaims(token).get("tier", String.class);
    }

    public boolean isTokenValid(String token) {
        try {
            Claims claims = parseClaims(token);

            String subject = claims.getSubject();
            Date expiration = claims.getExpiration();

            logger.info("JWT subject: {}", subject);
            logger.info("JWT expiration: {}", expiration);

            if (subject == null || subject.isBlank()) {
                logger.error("JWT subject is missing");
                return false;
            }

            if (expiration != null &&
                    expiration.before(new Date())) {
                logger.error("JWT has expired");
                return false;
            }

            logger.info("JWT validation successful");
            return true;

        } catch (Exception exception) {
            logger.error(
                    "JWT validation failed: {} - {}",
                    exception.getClass().getSimpleName(),
                    exception.getMessage()
            );

            return false;
        }
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}