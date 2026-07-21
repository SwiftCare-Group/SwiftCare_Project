# SwiftCare Microservices

This is a working, transitional microservices conversion of the original SwiftCare Spring Boot backend.
The mobile app still uses one base URL:

```text
http://<computer-ip>:8080/api/v1
```

The API Gateway keeps all existing endpoint paths unchanged.

## Services

| Service | Port | Responsibility |
|---|---:|---|
| API Gateway | 8080 | Single public entry point and routing |
| Identity Service | 8081 | Patient registration/login, staff login, patient profile and health profile |
| Appointment Service | 8082 | Hospitals, departments, appointments and queue |
| Clinical Service | 8083 | Doctors, consultations, clinical records, prescriptions, pharmacy and lab results |
| Symptom Service | 8084 | Symptom submission, AI/rule classification and first aid |
| Subscription Service | 8085 | Paystack subscriptions and tier changes |
| Notification Service | 8086 | Firebase push notifications |
| Migration Runner | one-shot | Runs the existing Flyway migrations before services start |

## Important architecture note

To preserve the current application and database without losing data, this first conversion uses a shared PostgreSQL database with table ownership by service. This is a safe strangler-step for a student project and an approaching submission. The next production hardening step is to move each service to its own database/schema and replace read access to another service's tables with REST/events.

## Run with Docker

1. Copy `.env.example` to `.env` and change the secrets.
2. From this folder run:

```bash
docker compose up --build
```

3. Test:

```text
GET http://localhost:8080/api/v1/departments
```

## Run without Docker on Windows

Set `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, and `JWT_SECRET`, then run migrations:

```powershell
.\gradlew.bat :database-migration-runner:bootRun
```

Start each service in a separate terminal:

```powershell
.\gradlew.bat :identity-service:bootRun
.\gradlew.bat :appointment-service:bootRun
.\gradlew.bat :clinical-service:bootRun
.\gradlew.bat :symptom-service:bootRun
.\gradlew.bat :subscription-service:bootRun
.\gradlew.bat :notification-service:bootRun
.\gradlew.bat :api-gateway:bootRun
```

Or use:

```powershell
.\run-local.ps1
```

## Mobile app

Keep the React Native Axios base URL pointed only at the gateway:

```ts
baseURL: 'http://YOUR_COMPUTER_IP:8080/api/v1'
```

Do not point the mobile app at ports 8081-8086.

## Build all services

```powershell
.\gradlew.bat clean build
```
