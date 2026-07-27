package com.swiftcare.backend.auth;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;
@Component
@RequiredArgsConstructor
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
            System.out.println(
                    "Bootstrap admin not created: email is not configured."
            );
            return;
        }

        if (adminPassword == null || adminPassword.isBlank()) {
            System.out.println(
                    "Bootstrap admin not created: password is not configured."
            );
            return;
        }

        String normalizedEmail =
                adminEmail.trim().toLowerCase();

        Integer existingAdminCount = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM doctors
                WHERE LOWER(email) = LOWER(?)
                """,
                Integer.class,
                normalizedEmail
        );

        if (existingAdminCount != null && existingAdminCount > 0) {
            System.out.println(
                    "Bootstrap admin already exists: " + normalizedEmail
            );
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
            System.out.println(
                    "Bootstrap admin was not created because no department exists."
            );
            System.out.println(
                    "Create at least one department, then restart identity-service."
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
                "ADMIN-001",
                departmentId,
                true,
                false,
                "ADMIN"
        );

        System.out.println(
                "Bootstrap administrator created successfully: "
                        + normalizedEmail
        );
    }
}