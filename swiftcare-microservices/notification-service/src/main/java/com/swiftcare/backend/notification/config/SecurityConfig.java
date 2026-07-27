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

        .requestMatchers(
                HttpMethod.POST,
                "/notifications/devices"
        ).authenticated()

        .requestMatchers(
                HttpMethod.GET,
                "/notifications/devices"
        ).authenticated()

        .requestMatchers(
                HttpMethod.DELETE,
                "/notifications/devices/**"
        ).authenticated()

        .anyRequest().authenticated()
)                .addFilterBefore(
                        jwtFilter,
                        UsernamePasswordAuthenticationFilter.class
                )

                .build();
    }
}