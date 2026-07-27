package com.swiftcare.backend.common.security;

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

        String authorizationHeader =
                request.getHeader("Authorization");

        if (authorizationHeader == null
                || !authorizationHeader.startsWith("Bearer ")) {

            filterChain.doFilter(request, response);
            return;
        }

        String token = authorizationHeader.substring(7).trim();

        if (token.isBlank() || !jwtUtil.isTokenValid(token)) {
            filterChain.doFilter(request, response);
            return;
        }

        String email = jwtUtil.extractEmail(token);

        if (email != null
                && !email.isBlank()
                && SecurityContextHolder
                        .getContext()
                        .getAuthentication() == null) {

            List<SimpleGrantedAuthority> authorities =
                    new ArrayList<>();

            String role = jwtUtil.extractRole(token);
            String tier = jwtUtil.extractTier(token);

            if (role != null && !role.isBlank()) {
                String roleAuthority = role.startsWith("ROLE_")
                        ? role
                        : "ROLE_" + role;

                authorities.add(
                        new SimpleGrantedAuthority(roleAuthority)
                );
            }

            if (tier != null && !tier.isBlank()) {
                String tierAuthority = tier.startsWith("TIER_")
                        ? tier
                        : "TIER_" + tier;

                authorities.add(
                        new SimpleGrantedAuthority(tierAuthority)
                );
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

            SecurityContextHolder
                    .getContext()
                    .setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }
}