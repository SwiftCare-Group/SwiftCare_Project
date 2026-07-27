package com.swiftcare.backend.notification.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        System.out.println("Request path: " + request.getRequestURI());
        System.out.println("Authorization header present: " + (authHeader != null));

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            System.out.println("JWT missing or does not start with Bearer");
            filterChain.doFilter(request, response);
            return;
        }

        String token = authHeader.substring(7).trim();

        try {
            boolean valid = jwtUtil.isTokenValid(token);
            System.out.println("JWT valid: " + valid);

            if (!valid) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().write("Invalid or expired JWT");
                return;
            }

            String email = jwtUtil.extractEmail(token);
            String role = jwtUtil.extractRole(token);
            String tier = jwtUtil.extractTier(token);

            System.out.println("JWT email: " + email);
            System.out.println("JWT role: " + role);
            System.out.println("JWT tier: " + tier);

            if (email == null || email.isBlank()) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().write("JWT does not contain an email or subject");
                return;
            }

            if (SecurityContextHolder.getContext().getAuthentication() == null) {

                List<SimpleGrantedAuthority> authorities = new ArrayList<>();

                if (role != null && !role.isBlank()) {
                    String normalizedRole = role.startsWith("ROLE_")
                            ? role
                            : "ROLE_" + role;

                    authorities.add(new SimpleGrantedAuthority(normalizedRole));
                }

                if (tier != null && !tier.isBlank()) {
                    String normalizedTier = tier.startsWith("TIER_")
                            ? tier
                            : "TIER_" + tier;

                    authorities.add(new SimpleGrantedAuthority(normalizedTier));
                }

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                email,
                                null,
                                authorities
                        );

                authentication.setDetails(
                        new WebAuthenticationDetailsSource()
                                .buildDetails(request)
                );

                SecurityContextHolder.getContext()
                        .setAuthentication(authentication);

                System.out.println(
                        "Authentication created for: "
                                + authentication.getName()
                );
            }

        } catch (Exception exception) {
            System.out.println("JWT processing error: " + exception.getMessage());

            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().write("JWT processing failed");
            return;
        }

        filterChain.doFilter(request, response);
    }
}