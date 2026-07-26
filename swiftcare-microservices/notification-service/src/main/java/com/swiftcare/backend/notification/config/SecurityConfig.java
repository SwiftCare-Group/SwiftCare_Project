package com.swiftcare.notification.config;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final InternalServiceKeyFilter internalServiceKeyFilter;

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http
    ) throws Exception {

        http
                .csrf(csrf -> csrf.disable())

                .cors(Customizer.withDefaults())

                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                .authorizeHttpRequests(auth -> auth

                        // Health endpoints used by Docker and Render.
                        .requestMatchers(
                                "/actuator/health",
                                "/actuator/health/**",
                                "/actuator/info"
                        )
                        .permitAll()

                        /*
                         * Appointment-service calls these routes using
                         * X-Internal-Service-Key.
                         *
                         * The InternalServiceKeyFilter validates the key.
                         */
                        .requestMatchers("/internal/**")
                        .permitAll()

                        /*
                         * Patients must provide a valid JWT when saving,
                         * updating or deleting their device token.
                         */
                        .requestMatchers("/notifications/devices/**")
                        .authenticated()

                        // Any other notification route also requires JWT.
                        .anyRequest()
                        .authenticated()
                )

                .oauth2ResourceServer(oauth2 ->
                        oauth2
                                .jwt(jwt ->
                                        jwt.jwtAuthenticationConverter(
                                                jwtAuthenticationConverter()
                                        )
                                )
                                .authenticationEntryPoint(
                                        (request, response, exception) -> {
                                            response.setStatus(
                                                    HttpServletResponse.SC_UNAUTHORIZED
                                            );
                                            response.setContentType(
                                                    "application/json"
                                            );
                                            response.getWriter().write(
                                                    """
                                                    {
                                                      "status": 401,
                                                      "error": "Unauthorized",
                                                      "message": "A valid access token is required."
                                                    }
                                                    """
                                            );
                                        }
                                )
                )

                .exceptionHandling(exceptions ->
                        exceptions.accessDeniedHandler(
                                (request, response, exception) -> {
                                    response.setStatus(
                                            HttpServletResponse.SC_FORBIDDEN
                                    );
                                    response.setContentType(
                                            "application/json"
                                    );
                                    response.getWriter().write(
                                            """
                                            {
                                              "status": 403,
                                              "error": "Forbidden",
                                              "message": "You do not have permission to access this resource."
                                            }
                                            """
                                    );
                                }
                        )
                )

                /*
                 * Internal service authentication is checked before
                 * Spring processes normal bearer-token authentication.
                 */
                .addFilterBefore(
                        internalServiceKeyFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        if (jwtSecret == null || jwtSecret.isBlank()) {
            throw new IllegalStateException(
                    "JWT_SECRET is missing."
            );
        }

        byte[] secretBytes =
                jwtSecret.getBytes(StandardCharsets.UTF_8);

        if (secretBytes.length < 32) {
            throw new IllegalStateException(
                    "JWT_SECRET must contain at least 32 bytes."
            );
        }

        SecretKeySpec secretKey = new SecretKeySpec(
                secretBytes,
                "HmacSHA256"
        );

        return NimbusJwtDecoder
                .withSecretKey(secretKey)
                .macAlgorithm(
                        org.springframework.security.oauth2.jose.jws.MacAlgorithm.HS256
                )
                .build();
    }

    @Bean
    public Converter<Jwt, ? extends AbstractAuthenticationToken>
    jwtAuthenticationConverter() {

        JwtGrantedAuthoritiesConverter authoritiesConverter =
                new JwtGrantedAuthoritiesConverter();

        /*
         * This expects your JWT to contain a claim such as:
         *
         * "role": "PATIENT"
         *
         * Spring will convert it to ROLE_PATIENT.
         */
        authoritiesConverter.setAuthoritiesClaimName("role");
        authoritiesConverter.setAuthorityPrefix("ROLE_");

        JwtAuthenticationConverter authenticationConverter =
                new JwtAuthenticationConverter();

        authenticationConverter.setJwtGrantedAuthoritiesConverter(
                authoritiesConverter
        );

        /*
         * Prefer the email claim as the authenticated principal.
         * Change this to "sub" if your JWT only contains a subject.
         */
        authenticationConverter.setPrincipalClaimName("email");

        return authenticationConverter;
    }
}