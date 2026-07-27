package com.swiftcare.backend.common.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expiry-ms}")
    private long expiryMs;

    public String generateToken(String email, String role) {
        return generateToken(email, role, "FREE");
    }

    public String generateToken(
            String email,
            String role,
            String tier
    ) {
        return Jwts.builder()
                .subject(email)
                .claim("role", normalizeRole(role))
                .claim("tier", normalizeTier(tier))
                .issuedAt(new Date())
                .expiration(
                        new Date(
                                System.currentTimeMillis() + expiryMs
                        )
                )
                .signWith(getSigningKey())
                .compact();
    }

    public String extractEmail(String token) {
        return parseClaims(token).getSubject();
    }

    public String extractRole(String token) {
        return parseClaims(token)
                .get("role", String.class);
    }

    public String extractTier(String token) {
        return parseClaims(token)
                .get("tier", String.class);
    }

    public boolean isTokenValid(String token) {
        try {
            Claims claims = parseClaims(token);

            Date expiration = claims.getExpiration();

            return expiration != null
                    && expiration.after(new Date());
        } catch (Exception exception) {
            System.out.println(
                    "JWT validation failed: "
                            + exception.getClass().getSimpleName()
                            + " - "
                            + exception.getMessage()
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

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(
                secret.getBytes(StandardCharsets.UTF_8)
        );
    }

    private String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            throw new IllegalArgumentException(
                    "JWT role cannot be empty"
            );
        }

        return role.startsWith("ROLE_")
                ? role.substring(5)
                : role;
    }

    private String normalizeTier(String tier) {
        if (tier == null || tier.isBlank()) {
            return "FREE";
        }

        return tier.startsWith("TIER_")
                ? tier.substring(5)
                : tier;
    }
}