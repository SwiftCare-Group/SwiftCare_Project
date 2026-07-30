package com.swiftcare.backend.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Date;
import java.util.HexFormat;
import java.util.Locale;

@Component
public class JwtUtil {

    private static final Logger log = LoggerFactory.getLogger(JwtUtil.class);
    private static final int MINIMUM_HMAC_KEY_BYTES = 32;

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expiry-ms}")
    private long expiryMs;

    @PostConstruct
    void validateConfiguration() {
        byte[] keyBytes = secret == null
                ? new byte[0]
                : secret.getBytes(StandardCharsets.UTF_8);

        if (keyBytes.length < MINIMUM_HMAC_KEY_BYTES) {
            throw new IllegalStateException(
                    "JWT_SECRET must contain at least 32 UTF-8 bytes"
            );
        }

        if (expiryMs <= 0) {
            throw new IllegalStateException("JWT expiry must be greater than zero");
        }

        try {
            String fingerprint = HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(keyBytes)
            ).substring(0, 12);

            // This fingerprint is safe to compare between services and does not
            // expose the signing secret itself.
            log.info("JWT signing-key fingerprint: {}", fingerprint);
        } catch (Exception exception) {
            throw new IllegalStateException(
                    "Unable to validate JWT signing configuration",
                    exception
            );
        }

        if (secret.startsWith("change-this-development-secret")) {
            log.warn("The default development JWT secret is in use. Configure JWT_SECRET before deployment.");
        }
    }

    public String generateToken(String email, String role) {
        return generateToken(email, role, "FREE");
    }

    public String generateToken(
            String email,
            String role,
            String tier
    ) {
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("JWT subject email cannot be empty");
        }

        return Jwts.builder()
                .subject(email.trim().toLowerCase(Locale.ROOT))
                .claim("role", normalizeRole(role))
                .claim("tier", normalizeTier(tier))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expiryMs))
                .signWith(getSigningKey())
                .compact();
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
            Date expiration = claims.getExpiration();
            String subject = claims.getSubject();

            return expiration != null
                    && expiration.after(new Date())
                    && subject != null
                    && !subject.isBlank();
        } catch (Exception exception) {
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

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    private String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            throw new IllegalArgumentException("JWT role cannot be empty");
        }

        String normalized = role.trim().toUpperCase(Locale.ROOT);
        return normalized.startsWith("ROLE_")
                ? normalized.substring(5)
                : normalized;
    }

    private String normalizeTier(String tier) {
        if (tier == null || tier.isBlank()) {
            return "FREE";
        }

        String normalized = tier.trim().toUpperCase(Locale.ROOT);
        return normalized.startsWith("TIER_")
                ? normalized.substring(5)
                : normalized;
    }
}
