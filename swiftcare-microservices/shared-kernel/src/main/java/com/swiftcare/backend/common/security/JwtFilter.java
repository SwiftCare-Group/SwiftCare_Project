package com.swiftcare.backend.common.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {

    private static final Set<String> PUBLIC_PATHS = Set.of(
            "/auth/register",
            "/auth/login",
            "/auth/staff/login",
            "/auth/refresh",
            "/auth/logout",
            "/auth/forgot-password",
            "/auth/reset-password",
            "/subscriptions/plans",
            "/subscriptions/webhook"
    );

    private final JwtUtil jwtUtil;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (HttpMethod.OPTIONS.matches(request.getMethod())) {
            return true;
        }

        String path = request.getRequestURI();
        String contextPath = request.getContextPath();

        if (contextPath != null
                && !contextPath.isBlank()
                && path.startsWith(contextPath)) {
            path = path.substring(contextPath.length());
        }

        return path.startsWith("/actuator/") || PUBLIC_PATHS.contains(path);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String authorizationHeader = request.getHeader("Authorization");

        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            filterChain.doFilter(request, response);
            return;
        }

        if (!authorizationHeader.regionMatches(true, 0, "Bearer ", 0, 7)) {
            writeUnauthorized(response, "Authorization header must use the Bearer scheme");
            return;
        }

        String token = authorizationHeader.substring(7).trim();

        if (token.isBlank() || !jwtUtil.isTokenValid(token)) {
            writeUnauthorized(response, "Access token is invalid or expired");
            return;
        }

        try {
            String email = jwtUtil.extractEmail(token);
            String role = jwtUtil.extractRole(token);
            String tier = jwtUtil.extractTier(token);

            if (email == null || email.isBlank() || role == null || role.isBlank()) {
                writeUnauthorized(response, "Access token is missing required identity claims");
                return;
            }

            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                List<SimpleGrantedAuthority> authorities = new ArrayList<>();

                String normalizedRole = role.trim().toUpperCase(Locale.ROOT);
                authorities.add(new SimpleGrantedAuthority(
                        normalizedRole.startsWith("ROLE_")
                                ? normalizedRole
                                : "ROLE_" + normalizedRole
                ));

                if (tier != null && !tier.isBlank()) {
                    String normalizedTier = tier.trim().toUpperCase(Locale.ROOT);
                    authorities.add(new SimpleGrantedAuthority(
                            normalizedTier.startsWith("TIER_")
                                    ? normalizedTier
                                    : "TIER_" + normalizedTier
                    ));
                }

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                email.trim().toLowerCase(Locale.ROOT),
                                null,
                                authorities
                        );

                authentication.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request)
                );

                SecurityContextHolder.getContext().setAuthentication(authentication);
            }

            filterChain.doFilter(request, response);
        } catch (RuntimeException exception) {
            writeUnauthorized(response, "Access token could not be verified");
        }
    }

    private void writeUnauthorized(
            HttpServletResponse response,
            String message
    ) throws IOException {
        SecurityContextHolder.clearContext();
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");
        response.getWriter().write(
                "{\"status\":401,\"error\":\"Unauthorized\",\"message\":\""
                        + message
                        + "\"}"
        );
    }
}
