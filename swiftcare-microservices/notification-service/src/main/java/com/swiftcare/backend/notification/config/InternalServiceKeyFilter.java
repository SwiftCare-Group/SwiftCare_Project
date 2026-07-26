package com.swiftcare.notification.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Component
public class InternalServiceKeyFilter
        extends OncePerRequestFilter {

    private static final String INTERNAL_PATH_PREFIX =
            "/internal/";

    private static final String INTERNAL_KEY_HEADER =
            "X-Internal-Service-Key";

    @Value("${internal.service-key}")
    private String expectedServiceKey;

    @Override
    protected boolean shouldNotFilter(
            HttpServletRequest request
    ) {
        String servletPath = request.getServletPath();

        return servletPath == null ||
                !servletPath.startsWith(INTERNAL_PATH_PREFIX);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String suppliedServiceKey =
                request.getHeader(INTERNAL_KEY_HEADER);

        if (!isValidServiceKey(suppliedServiceKey)) {
            response.setStatus(
                    HttpServletResponse.SC_UNAUTHORIZED
            );

            response.setContentType("application/json");

            response.getWriter().write(
                    """
                    {
                      "status": 401,
                      "error": "Unauthorized",
                      "message": "A valid internal service key is required."
                    }
                    """
            );

            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean isValidServiceKey(
            String suppliedServiceKey
    ) {
        if (
                suppliedServiceKey == null ||
                suppliedServiceKey.isBlank() ||
                expectedServiceKey == null ||
                expectedServiceKey.isBlank()
        ) {
            return false;
        }

        return MessageDigest.isEqual(
                suppliedServiceKey.getBytes(
                        StandardCharsets.UTF_8
                ),
                expectedServiceKey.getBytes(
                        StandardCharsets.UTF_8
                )
        );
    }
}