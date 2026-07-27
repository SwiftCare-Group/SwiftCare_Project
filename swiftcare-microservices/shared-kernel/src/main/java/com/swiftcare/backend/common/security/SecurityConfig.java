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

                        .requestMatchers(
                                "/actuator/health/**",
                                "/actuator/info"
                        ).permitAll()

                        .requestMatchers(
                                "/auth/register",
                                "/auth/login",
                                "/auth/refresh",
                                "/auth/logout",
                                "/auth/staff/login",
                                "/auth/forgot-password",
                                "/auth/reset-password"
                        ).permitAll()

                        .requestMatchers(
                                "/subscriptions/webhook"
                        ).permitAll()

                        .requestMatchers(
                                "/internal/**"
                        ).permitAll()

                        .requestMatchers(
                                HttpMethod.GET,
                                "/departments/**"
                        ).permitAll()

                        /*
                         * Consultation permissions
                         */

                        .requestMatchers(
                                HttpMethod.POST,
                                "/consultations"
                        ).hasRole("PATIENT")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/consultations"
                        ).hasRole("PATIENT")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/consultations/doctors"
                        ).authenticated()

                        .requestMatchers(
                                HttpMethod.GET,
                                "/consultations/doctor/**"
                        ).hasRole("DOCTOR")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/consultations/*"
                        ).hasAnyRole(
                                "PATIENT",
                                "DOCTOR",
                                "ADMIN"
                        )

                        .requestMatchers(
                                HttpMethod.PUT,
                                "/consultations/*/join",
                                "/consultations/*/complete",
                                "/consultations/*/cancel"
                        ).hasRole("DOCTOR")

                        /*
                         * Prescription permissions
                         */

                        .requestMatchers(
                                HttpMethod.POST,
                                "/prescriptions"
                        ).hasRole("DOCTOR")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/prescriptions/*/dispense"
                        ).hasRole("PHARMACIST")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/prescriptions/my"
                        ).hasRole("PATIENT")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/prescriptions/*/remaining"
                        ).hasAnyRole(
                                "DOCTOR",
                                "PHARMACIST"
                        )

                        .requestMatchers(
                                HttpMethod.GET,
                                "/prescriptions/*/qr"
                        ).hasAnyRole(
                                "PATIENT",
                                "DOCTOR",
                                "PHARMACIST"
                        )

                        .requestMatchers(
                                HttpMethod.GET,
                                "/prescriptions/*"
                        ).hasAnyRole(
                                "PATIENT",
                                "DOCTOR",
                                "PHARMACIST"
                        )

                        /*
                         * Laboratory permissions
                         */

                        .requestMatchers(
                                HttpMethod.POST,
                                "/lab-orders"
                        ).hasRole("DOCTOR")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/lab-orders/doctor/me"
                        ).hasRole("DOCTOR")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/lab-orders/patient/me"
                        ).hasRole("PATIENT")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/lab-orders/pending"
                        ).hasAnyRole(
                                "ADMIN",
                                "LAB_TECHNICIAN"
                        )

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/lab-orders/*/start"
                        ).hasAnyRole(
                                "ADMIN",
                                "LAB_TECHNICIAN"
                        )

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/lab-orders/*/result"
                        ).hasAnyRole(
                                "ADMIN",
                                "LAB_TECHNICIAN"
                        )

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/lab-orders/*/cancel"
                        ).hasRole("DOCTOR")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/lab-orders/*"
                        ).hasAnyRole(
                                "PATIENT",
                                "DOCTOR",
                                "ADMIN",
                                "LAB_TECHNICIAN"
                        )

                        /*
                         * Admin permissions
                         */

                        .requestMatchers(
                                "/admin/**"
                        ).hasRole("ADMIN")

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