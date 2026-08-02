# SwiftCare

SwiftCare is a freemium hospital queue-management and online consultation app. Patients can submit symptoms, book hospital visits, track queue progress, manage clinical records, and—when Premium is active—book and join live video consultations.

## Maintained project layout

| Path | Purpose |
|---|---|
| mobile/ | Expo SDK 54 React Native application |
| swiftcare-microservices/ | Maintained Spring Boot backend and API gateway |
| backend/ | Legacy placeholder; do not use for current development |
| backend-monolith-backup/ | Read-only migration reference |

The mobile app talks only to the API gateway on port 8080. The gateway routes requests to identity, appointment, clinical, symptom, subscription, and notification services.

## Requirements

- Node.js 18 or newer
- Java 21 or newer
- Docker Desktop for the simplest complete backend startup
- PostgreSQL when running without Docker
- Expo Go or an Android/iOS development build

## Start the backend

From swiftcare-microservices:

1. Copy .env.example to .env.
2. Replace every placeholder secret.
3. Start the stack:

       docker compose up --build

The gateway is then available at:

    http://localhost:8080/api/v1

For Windows development without Docker, set the database and security environment variables, run the migration runner first, and then run:

    .\run-local.ps1

See swiftcare-microservices/README.md for service-by-service commands.

## Start the mobile app

From mobile:

    npm install
    npx expo start

Set EXPO_PUBLIC_API_URL when the gateway is not running at the automatically detected development address. Always point the app at the gateway, never directly at ports 8081–8086.

## Access tiers

Free patients retain the core hospital experience: symptom assessment, hospital appointments, queue tracking, health profile, prescriptions, laboratory results, medical history, and notifications.

Premium patients receive online consultation booking and video-room access. The server verifies both the token tier and the current, unexpired subscription record. Queue severity remains the primary priority; Premium is only a tie-breaker at equal severity.

See swiftcare-microservices/docs/FEATURE_ACCESS.md for the exact matrix.

## Video consultation flow

- A Premium patient books an available doctor.
- The room opens 15 minutes before the scheduled time.
- Patient and doctor grant camera and microphone permissions.
- SwiftCare opens the HTTPS Jitsi room inside the app.
- The doctor records findings and completes the consultation only after the session has started.

## Authentication

Patients use Patient Login. Doctors, pharmacists, laboratory staff, and administrators use Staff Login. Bootstrap administrator credentials are optional environment variables and should never be committed.

## Verification

Backend:

    .\gradlew.bat clean test --no-daemon

Mobile:

    .\node_modules\.bin\tsc.cmd --noEmit --pretty false
    .\node_modules\.bin\expo.cmd export --platform web

## Security note

The supplied archive contained copied database and signing credentials. Those override files have been removed from this working copy and the examples now contain placeholders. Rotate the original database password, JWT secret, and any third-party keys before deploying, because deleting them from this copy does not revoke them.