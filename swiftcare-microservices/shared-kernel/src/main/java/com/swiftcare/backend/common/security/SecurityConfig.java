package com.swiftcare.backend.common.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> {
                })
                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )
                .authorizeHttpRequests(auth -> auth

                        /*
                         * Public monitoring endpoints
                         */
                        .requestMatchers(
                                "/actuator/health/**",
                                "/actuator/info"
                        ).permitAll()

                        /*
                         * Public authentication endpoints
                         */
                        .requestMatchers(
                                "/auth/register",
                                "/auth/login",
                                "/auth/refresh",
                                "/auth/logout",
                                "/auth/staff/login",
                                "/auth/forgot-password",
                                "/auth/reset-password"
                        ).permitAll()

                        /*
                         * Public webhook endpoint
                         */
                        .requestMatchers("/subscriptions/webhook")
                        .permitAll()

                        /*
                         * Internal microservice endpoints
                         *
                         * These should also be protected with an internal
                         * service key inside the controller or a separate filter.
                         */
                        .requestMatchers("/internal/**")
                        .permitAll()

                        /*
                         * Public department endpoints
                         */
                        .requestMatchers(
                                HttpMethod.GET,
                                "/departments/**"
                        ).permitAll()

                        /*
                         * Consultation permissions
                         */

                        // Patients can book consultations.
                        .requestMatchers(
                                HttpMethod.POST,
                                "/consultations"
                        ).hasRole("PATIENT")

                        // Patients can retrieve their own consultations.
                        .requestMatchers(
                                HttpMethod.GET,
                                "/consultations"
                        ).hasRole("PATIENT")

                        // Doctors can retrieve their assigned consultations.
                        .requestMatchers(
                                HttpMethod.GET,
                                "/consultations/doctor/**"
                        ).hasRole("DOCTOR")

                         // Authenticated users may view available doctors.
                        .requestMatchers(
                                HttpMethod.GET,
                                "/consultations/doctors"
                        ).authenticated()

                        // All relevant authenticated roles can retrieve one consultation.
                        .requestMatchers(
                                HttpMethod.GET,
                                "/consultations/*"
                        ).hasAnyRole(
                                "PATIENT",
                                "DOCTOR",
                                "ADMIN"
                        )

                        // Doctors can join, complete, or cancel consultations.
                        .requestMatchers(
                                HttpMethod.PUT,
                                "/consultations/*/join",
                                "/consultations/*/complete",
                                "/consultations/*/cancel"
                        ).hasRole("DOCTOR")

                    

                        /*
                         * Prescription permissions
                         */

                        // Only doctors can issue prescriptions.
                        .requestMatchers(
                                HttpMethod.POST,
                                "/prescriptions"
                        ).hasRole("DOCTOR")

                        // Only pharmacists can dispense prescribed drugs.
                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/prescriptions/*/dispense"
                        ).hasRole("PHARMACIST")

                        // Patients can retrieve their own prescriptions.
                        .requestMatchers(
                                HttpMethod.GET,
                                "/prescriptions/my"
                        ).hasRole("PATIENT")

                        // Doctors and pharmacists can check pending drugs.
                        .requestMatchers(
                                HttpMethod.GET,
                                "/prescriptions/*/remaining"
                        ).hasAnyRole(
                                "DOCTOR",
                                "PHARMACIST"
                        )

                        // Relevant users can retrieve prescription QR codes.
                        .requestMatchers(
                                HttpMethod.GET,
                                "/prescriptions/*/qr"
                        ).hasAnyRole(
                                "PATIENT",
                                "DOCTOR",
                                "PHARMACIST"
                        )

                        // Relevant users can retrieve a prescription by ID.
                        .requestMatchers(
                                HttpMethod.GET,
                                "/prescriptions/*"
                        ).hasAnyRole(
                                "PATIENT",
                                "DOCTOR",
                                "PHARMACIST"
                        )

                        /*
                         * Admin permissions
                         */
                        .requestMatchers("/admin/**")
                        .hasRole("ADMIN")

                        /*
                         * All remaining endpoints require authentication.
                         */
                        .anyRequest()
                        .authenticated()
                )
                .addFilterBefore(
                        jwtFilter,
                        UsernamePasswordAuthenticationFilter.class
                )
                .build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationManager authenticationManager(
            AuthenticationConfiguration configuration
    ) throws Exception {
        return configuration.getAuthenticationManager();
    }
}