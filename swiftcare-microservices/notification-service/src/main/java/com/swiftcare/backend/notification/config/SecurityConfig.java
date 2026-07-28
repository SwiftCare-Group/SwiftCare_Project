package com.swiftcare.backend.notification.config;

import com.swiftcare.backend.notification.security.JwtFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtFilter jwtFilter;
    private final InternalServiceKeyFilter internalServiceKeyFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http)
            throws Exception {

        return http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/actuator/health",
                                "/actuator/info"
                        ).permitAll()
                        // Internal requests are authenticated by InternalServiceKeyFilter.
                        .requestMatchers("/internal/**").permitAll()
                        .requestMatchers(
                                HttpMethod.POST,
                                "/notifications/devices"
                        ).hasRole("PATIENT")
                        .requestMatchers(
                                HttpMethod.GET,
                                "/notifications/devices"
                        ).hasRole("PATIENT")
                        .requestMatchers(
                                HttpMethod.DELETE,
                                "/notifications/devices/**"
                        ).hasRole("PATIENT")
                        .anyRequest().authenticated()
                )
                // Register JwtFilter first so Spring Security knows its order.
                .addFilterBefore(
                        jwtFilter,
                        UsernamePasswordAuthenticationFilter.class
                )
                .addFilterBefore(
                        internalServiceKeyFilter,
                        JwtFilter.class
                )
                .build();
    }
}
