# SwiftCare Microservices

This directory contains the maintained SwiftCare backend. The mobile app uses one base URL:

    http://<computer-ip>:8080/api/v1

The API gateway preserves the public endpoint paths and routes each request to its owning service.

## Requirements

- Java 21 or newer
- Docker Desktop, or a reachable PostgreSQL database
- One shared JWT_SECRET across every service
- One separate shared INTERNAL_SERVICE_KEY across trusted services

## Services

| Service | Port | Responsibility |
|---|---:|---|
| API Gateway | 8080 | Public entry point, routing, CORS, retry, health routes |
| Identity Service | 8081 | Authentication, patient profile, health profile |
| Appointment Service | 8082 | Departments, appointments, slots, queue |
| Clinical Service | 8083 | Consultations, doctors, records, prescriptions, pharmacy, laboratory |
| Symptom Service | 8084 | Symptom classification and first-aid guidance |
| Subscription Service | 8085 | Paystack subscription lifecycle and patient tier |
| Notification Service | 8086 | Push-device registration and internal notifications |
| Migration Runner | one-shot | Flyway database migrations |

The services currently share one PostgreSQL database. This is a deliberate transitional architecture; each service owns its domain logic while the existing data model remains compatible.

## Run with Docker

1. Copy .env.example to .env.
2. Replace every placeholder. Never reuse JWT_SECRET as INTERNAL_SERVICE_KEY.
3. Run:

       docker compose up --build

4. Check the gateway:

       GET http://localhost:8080/actuator/health

Health/wake routes are also available at:

    /api/v1/system/identity-health
    /api/v1/system/appointment-health
    /api/v1/system/clinical-health
    /api/v1/system/symptom-health
    /api/v1/system/subscription-health
    /api/v1/system/notification-health

## Run on Windows without Docker

Set DB_URL, DB_USERNAME, DB_PASSWORD, JWT_SECRET, and INTERNAL_SERVICE_KEY. Run migrations first:

    .\gradlew.bat :database-migration-runner:bootRun

Then run:

    .\run-local.ps1

Alternatively, start each bootRun task in its own terminal.

## Mobile app

Point the React Native app only at the gateway:

    EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:8080

Do not point the mobile app at ports 8081–8086.

## Build and test

    .\gradlew.bat clean test --no-daemon

See docs/FEATURE_ACCESS.md for the Free/Premium contract. A complete live endpoint smoke test additionally requires a PostgreSQL database and role-specific test accounts.