package com.swiftcare.backend.auth;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;
@Component
@RequiredArgsConstructor
@Slf4j
public class AdminAccountSeeder implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap-admin.email:}")
    private String adminEmail;

    @Value("${app.bootstrap-admin.password:}")
    private String adminPassword;

    @Value("${app.bootstrap-admin.name:SwiftCare Administrator}")
    private String adminName;

    @Override
    public void run(String... args) {

        if (adminEmail == null || adminEmail.isBlank()) {
            log.info(
                    "Bootstrap administrator not created because email is not configured"
            );
            return;
        }

        if (adminPassword == null || adminPassword.isBlank()) {
            log.info(
                    "Bootstrap administrator not created because password is not configured"
            );
            return;
        }

        String normalizedEmail =
                adminEmail.trim().toLowerCase();

        Integer existingIdentityCount = jdbcTemplate.queryForObject(
                """
                SELECT (
                    SELECT COUNT(*) FROM doctors WHERE LOWER(email) = LOWER(?)
                ) + (
                    SELECT COUNT(*) FROM patients WHERE LOWER(email) = LOWER(?)
                )
                """,
                Integer.class,
                normalizedEmail,
                normalizedEmail
        );

        if (existingIdentityCount != null && existingIdentityCount > 0) {
            log.info("Bootstrap administrator email already belongs to an account");
            return;
        }

        List<UUID> departmentIds = jdbcTemplate.query(
                """
                SELECT id
                FROM departments
                ORDER BY name
                LIMIT 1
                """,
                (resultSet, rowNumber) ->
                        resultSet.getObject("id", UUID.class)
        );

        if (departmentIds.isEmpty()) {
            log.warn(
                    "Bootstrap administrator was not created because no department exists"
            );
            return;
        }

        UUID departmentId = departmentIds.get(0);
        UUID adminId = UUID.randomUUID();

        String passwordHash =
                passwordEncoder.encode(adminPassword);

        jdbcTemplate.update(
                """
                INSERT INTO doctors (
                    id,
                    name,
                    email,
                    password_hash,
                    license_no,
                    department_id,
                    is_available_online,
                    is_deleted,
                    role
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                adminId,
                adminName,
                normalizedEmail,
                passwordHash,
                "ADMIN-" + adminId.toString().substring(0, 8).toUpperCase(),
                departmentId,
                true,
                false,
                "ADMIN"
        );

        log.info("Bootstrap administrator created successfully");
    }
}