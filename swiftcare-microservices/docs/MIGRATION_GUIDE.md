# Migration Guide from the Monolith

## 1. Back up the existing backend

Keep the original `backend` folder until the microservices build and smoke tests pass.

## 2. Copy environment variables

Create `.env` from `.env.example` and use the same PostgreSQL/Neon connection values currently used by the monolith.

All services must use the same `JWT_SECRET`.

## 3. Run the migration runner

The migration runner contains the original Flyway scripts. Against an existing database it validates the current migration history and applies only pending migrations.

```powershell
.\gradlew.bat :database-migration-runner:bootRun
```

## 4. Start the services

Start ports 8081 through 8086 first, then start the gateway on 8080.

```powershell
.\run-local.ps1
```

## 5. Keep the mobile API URL unchanged

```ts
baseURL: 'http://YOUR_COMPUTER_IP:8080/api/v1'
```

## 6. Smoke tests

1. `GET /api/v1/departments`
2. `POST /api/v1/auth/register`
3. `POST /api/v1/auth/login`
4. `POST /api/v1/appointments`
5. `GET /api/v1/appointments`
6. `GET /api/v1/departments/{departmentId}/queue`
7. Doctor call/start/clinical-record/complete flow

## 7. Severity migration

Appointments now accept only severity scores 1 to 4:

- 1 Mild
- 2 Moderate
- 3 Severe
- 4 Emergency

The queue sorts higher scores first, preserving emergency priority.
