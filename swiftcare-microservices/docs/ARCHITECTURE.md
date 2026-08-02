# SwiftCare Microservices Architecture

## Request flow

```text
Expo mobile app
      |
      v
API Gateway :8080
      |
      +--> Identity Service :8081
      +--> Appointment Service :8082
      +--> Clinical Service :8083
      +--> Symptom Service :8084
      +--> Subscription Service :8085
      +--> Notification Service :8086 (internal)
```

The mobile app continues to use:

```text
http://<host>:8080/api/v1
```

The gateway forwards the existing endpoint paths without requiring frontend route changes.

## Bounded contexts

### Identity Service

- Patient registration and login
- Staff login
- Refresh tokens
- Patient account details
- Health profile

### Appointment Service

- Hospitals and departments
- Appointment booking
- Patient-selected severity levels
- Queue creation and ordering
- Doctor queue state transitions

Severity is now consistently represented as:

```text
4 = EMERGENCY
3 = SEVERE
2 = MODERATE
1 = MILD
```

Queue ordering remains severity descending, then premium status, then scheduled time.

### Clinical Service

- Doctor management
- Consultations
- Clinical records
- Prescriptions and QR codes
- Dispensation records
- Lab results

### Symptom Service

- Symptom submissions
- AI classification
- Rule-based fallback
- First-aid advice

The symptom classifier may still use its independent 1–10 clinical score. Appointment priority uses the new patient-selected 1–4 score.

### Subscription Service

- Paystack initialization
- Subscription status and cancellation
- Patient tier upgrades and expiry processing

### Notification Service

- Firebase push notifications
- Internal notification endpoint

### Database Migration Runner

- Owns and runs all existing Flyway migrations
- Runs before the application services when using Docker Compose

## Database strategy

This conversion deliberately uses a shared PostgreSQL database as a transitional step so the existing schema and data continue to work. Each deployable service has a defined set of owned tables, but a few read models still access tables owned by another service.

A later production phase should:

1. Give each service its own database or PostgreSQL schema.
2. Replace cross-service table reads with REST clients or events.
3. Add an outbox pattern for reliable events.
4. Add distributed tracing and centralized logs.
5. Add service-specific integration and contract tests.
