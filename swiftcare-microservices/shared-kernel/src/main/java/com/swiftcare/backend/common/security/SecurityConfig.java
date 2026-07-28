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
                        .requestMatchers("/subscriptions/webhook")
                        .permitAll()
                        .requestMatchers(
                                "/subscriptions/upgrade",
                                "/subscriptions/verify",
                                "/subscriptions/status",
                                "/subscriptions/plans",
                                "/subscriptions/cancel"
                        ).hasRole("PATIENT")

                        /* Patient profile permissions. */
                        .requestMatchers(
                                "/patients/me/**",
                                "/profile/health"
                        ).hasRole("PATIENT")

                        /* Symptom assessment permissions. */
                        .requestMatchers(
                                HttpMethod.POST,
                                "/symptoms/submit"
                        ).hasRole("PATIENT")
                        .requestMatchers(
                                HttpMethod.GET,
                                "/symptoms/**"
                        ).hasAnyRole("PATIENT", "DOCTOR", "ADMIN")

                        /* Appointment and queue permissions. */
                        .requestMatchers(
                                HttpMethod.POST,
                                "/appointments"
                        ).hasRole("PATIENT")
                        .requestMatchers(
                                HttpMethod.GET,
                                "/appointments"
                        ).hasRole("PATIENT")
                        .requestMatchers(
                                HttpMethod.GET,
                                "/appointments/*",
                                "/appointments/*/queue"
                        ).hasAnyRole("PATIENT", "DOCTOR", "ADMIN")
                        .requestMatchers(
                                HttpMethod.PUT,
                                "/appointments/*/cancel"
                        ).hasAnyRole("PATIENT", "ADMIN")
                        .requestMatchers(
                                HttpMethod.GET,
                                "/departments/*/queue"
                        ).hasAnyRole("DOCTOR", "ADMIN")
                        .requestMatchers(
                                HttpMethod.GET,
                                "/queue/*"
                        ).hasAnyRole("PATIENT", "DOCTOR", "ADMIN")
                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/queue/*/call",
                                "/queue/*/skip",
                                "/queue/*/start",
                                "/queue/*/complete",
                                "/queue/*/cancel"
                        ).hasAnyRole("DOCTOR", "ADMIN")

                        /* Staff profile permissions. */
                        .requestMatchers(
                                HttpMethod.GET,
                                "/doctors/me"
                        ).hasAnyRole(
                                "DOCTOR",
                                "PHARMACIST",
                                "LAB_TECHNICIAN",
                                "ADMIN"
                        )

                        /* Consultation permissions. */
                        .requestMatchers(
                                HttpMethod.POST,
                                "/consultations/complete-workflow"
                        ).hasRole("DOCTOR")
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
                        ).hasAnyRole("PATIENT", "DOCTOR", "ADMIN")
                        .requestMatchers(
                                HttpMethod.PUT,
                                "/consultations/*/join"
                        ).hasAnyRole("PATIENT", "DOCTOR")
                        .requestMatchers(
                                HttpMethod.PUT,
                                "/consultations/*/complete"
                        ).hasAnyRole("DOCTOR", "ADMIN")
                        .requestMatchers(
                                HttpMethod.PUT,
                                "/consultations/*/cancel"
                        ).hasAnyRole("PATIENT", "DOCTOR", "ADMIN")

                        /* Prescription permissions. */
                        .requestMatchers(
                                HttpMethod.POST,
                                "/prescriptions"
                        ).hasRole("DOCTOR")
                        .requestMatchers(
                                HttpMethod.POST,
                                "/prescriptions/lookup"
                        ).hasRole("PHARMACIST")
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
                                "/prescriptions/*/remaining",
                                "/prescriptions/*/dispensations",
                                "/prescriptions/*/qr",
                                "/prescriptions/*"
                        ).hasAnyRole(
                                "PATIENT",
                                "DOCTOR",
                                "PHARMACIST",
                                "ADMIN"
                        )

                        /* Laboratory permissions. */
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
                        ).hasAnyRole("ADMIN", "LAB_TECHNICIAN")
                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/lab-orders/*/start",
                                "/lab-orders/*/result"
                        ).hasAnyRole("ADMIN", "LAB_TECHNICIAN")
                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/lab-orders/*/cancel"
                        ).hasAnyRole("DOCTOR", "ADMIN")
                        .requestMatchers(
                                HttpMethod.GET,
                                "/lab-orders/*"
                        ).hasAnyRole(
                                "PATIENT",
                                "DOCTOR",
                                "ADMIN",
                                "LAB_TECHNICIAN"
                        )

                        /* Clinical-record permissions. */
                        .requestMatchers(
                                HttpMethod.POST,
                                "/clinical-records",
                                "/clinical-records/complete"
                        ).hasRole("DOCTOR")
                        .requestMatchers(
                                HttpMethod.GET,
                                "/clinical-records/patient/me"
                        ).hasRole("PATIENT")
                        .requestMatchers(
                                HttpMethod.GET,
                                "/clinical-records/doctor/me",
                                "/clinical-records/queue/*",
                                "/clinical-records/patient/*"
                        ).hasAnyRole("DOCTOR", "ADMIN")
                        .requestMatchers(
                                HttpMethod.GET,
                                "/clinical-records/*"
                        ).hasAnyRole("PATIENT", "DOCTOR", "ADMIN")

                        .requestMatchers("/admin/**")
                        .hasRole("ADMIN")

                        // Department details and booking slots are public.
                        .requestMatchers(
                                HttpMethod.GET,
                                "/departments/**"
                        ).permitAll()

                        .anyRequest().authenticated()
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
