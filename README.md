# SwiftCare

**Smart Hospital Queue Management & Online Doctor Consultation App**

SwiftCare is a freemium mobile application that solves the problem of long, unmanaged hospital queues in Ghana. Patients can schedule appointments, submit symptoms for AI-powered severity classification, track their real-time queue position, and — on a premium subscription — consult a doctor live and receive a digital prescription dispensable via QR code at any pharmacy.

---

## Group 60 — KNUST

| Name | Student ID | Module |
|---|---|---|
| Konadu Felix Yiadom *(Team Lead)* | 21106324 | Auth + Health Profile + Subscriptions |
| Adjei Daniel Asante | 21106577 | Queue + Appointments + Database |
| Darko Ransford Nana | 21106615 | AI Classifier + Symptoms + Notifications |
| Owusu Yaw Frimpong | 21106572 | Consultations + Prescriptions + Pharmacy |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile App | React Native (Expo SDK 54) |
| Backend API | Java 17 + Spring Boot 3.5 |
| Database | PostgreSQL (Neon cloud) |
| AI Integration | Gemini API + Rule-based fallback classifier |
| Video Consultations | Jitsi Meet (WebRTC) |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| Authentication | JWT + Spring Security |
| QR Code Generation | ZXing |
| Payments | Paystack (integrated, pending production webhook) |
| Database Migrations | Flyway |
| ORM | Hibernate / Spring Data JPA |

---

## Monorepo Structure

```
swiftcare/
├── mobile/                        # React Native (Expo) app
│   ├── app/
│   │   ├── (auth)/                # Login, Register, Health Profile, Staff Login
│   │   ├── (patient)/             # Home, Queue, Appointments, Symptoms, Consultation, Prescription, Profile
│   │   ├── (doctor)/              # Doctor Queue, Consultation Panel
│   │   ├── (pharmacist)/          # QR Dispense Screen
│   │   └── (admin)/               # Dashboard, Departments, Staff Management
│   ├── components/
│   ├── services/
│   │   └── api.ts                 # Axios base instance with JWT interceptor
│   ├── constants/
│   │   └── colors.ts              # SwiftCare design system colors
│   └── package.json
│
├── backend/                       # Spring Boot REST API
│   ├── src/main/java/com/swiftcare/backend/
│   │   ├── auth/                  # JWT auth, refresh tokens, staff login
│   │   ├── patient/               # Patient entity + profile
│   │   ├── healthprofile/         # Health profile CRUD
│   │   ├── subscription/          # Freemium + Paystack
│   │   ├── appointment/           # Appointments + priority queue
│   │   ├── queue/                 # Queue entries + real-time tracking
│   │   ├── symptom/               # AI classifier + emergency detection
│   │   ├── notification/          # FCM push notifications
│   │   ├── consultation/          # Video sessions (Jitsi) + doctor management
│   │   ├── prescription/          # QR code generation + dispensation
│   │   ├── pharmacy/              # Dispensation records
│   │   ├── admin/                 # Department + staff management
│   │   └── common/                # JWT, security, enums, exceptions, AOP
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   └── db/migration/          # Flyway SQL migrations V1-V8
│   └── build.gradle
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Java 24+
- Expo Go app on your phone
- PostgreSQL database (Neon recommended)

### 1. Clone the repo

```bash
git clone https://github.com/SwiftCare-Group/SwiftCare_Project.git
cd SwiftCare_Project
git checkout development
```

### 2. Backend setup

Create `backend/src/main/resources/application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://your-neon-host/neondb?sslmode=require
    username: your_username
    password: your_password
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
  flyway:
    enabled: true
    locations: classpath:db/migration

server:
  port: 8080
  servlet:
    context-path: /api/v1

app:
  jwt:
    secret: your-jwt-secret-minimum-32-characters
    expiry-ms: 86400000

paystack:
  secret-key: your_paystack_test_secret_key

ai:
  api-key: your_gemini_api_key
  model: gemini-2.0-flash

firebase:
  credentials-path: firebase-service-account.json
```

Run the backend:

```bash
cd backend
./gradlew bootRun
```

Flyway will automatically run all migrations and set up the database schema.

### 3. Mobile app setup

```bash
cd mobile
npm install --legacy-peer-deps
```

Update `services/api.ts` with your machine's local IP:

```typescript
baseURL: 'http://YOUR_LOCAL_IP:8080/api/v1'
```

Start the app:

```bash
npx expo start
```

Scan the QR code with Expo Go on your phone. Make sure your phone and laptop are on the same WiFi network.

---

## Demo Accounts

| Role | Email | Password | Notes |
|---|---|---|---|
| Patient (Free) | kofi@test.com | password | Free tier |
| Patient (Premium) | ama.owusu@test.com | password | Premium tier |
| Patient (Free) | kweku@test.com | password | Free tier |
| Patient (Premium) | abena@test.com | password | Premium tier |
| Doctor | kwame@swiftcare.com | password | Use Staff Login |
| Pharmacist | ama@swiftcare.com | password | Use Staff Login |
| Admin | admin@swiftcare.com | password | Patient Login |

---

## Demo Flow

### Patient Flow (Free)
1. Login as `kofi@test.com`
2. Submit symptoms → AI classifies severity
3. Book appointment → assigned queue position
4. Queue tracker → real-time position + estimated call time
5. Upgrade to Premium prompt visible in profile

### Patient Flow (Premium)
1. Login as `ama.owusu@test.com`
2. Book online consultation → select Dr. Kwame
3. Join session → Jitsi video call opens
4. Doctor issues prescription → QR code generated
5. Prescription screen → show QR code
6. Pharmacist scans → marks drugs dispensed

### Doctor Flow
1. Tap **Staff Login** on login screen
2. Login as `kwame@swiftcare.com`
3. View prioritised patient queue by severity
4. Join consultation session
5. Issue digital prescription

### Pharmacist Flow
1. Tap **Staff Login** on login screen
2. Login as `ama@swiftcare.com`
3. Enter prescription ID
4. Mark drugs as dispensed or unavailable

### Admin Flow
1. Login as `admin@swiftcare.com` (patient login screen)
2. View dashboard stats
3. Create new department
4. Create doctor account

---

## API Base URL

```
http://localhost:8080/api/v1        # Local development
```

All endpoints except `/auth/register`, `/auth/login`, `/auth/staff-login`, `/auth/refresh`, `/auth/logout`, and `/subscriptions/webhook` require a `Bearer` JWT token.

---

## Key Design Decisions

**Freemium access control** is enforced at the API level using a custom `@PremiumRequired` AOP annotation. Free users receive a `401` with an upgrade prompt when hitting premium endpoints.

**AI severity classification** uses a rule-based fallback classifier when the AI API is unavailable, ensuring the app always works during demos. The classifier returns MILD, MODERATE, SEVERE, or CRITICAL based on symptom keywords. It does not generate diagnoses — all clinical decisions remain with doctors.

**Priority queue algorithm** orders patients by severity score (descending), then by subscription tier (PREMIUM ahead of FREE at equal scores), then by scheduled time (ascending).

**Emergency escalation** bypasses the queue entirely — flagged patients move to position 1 and the doctor receives an immediate high-priority push notification.

**Prescription QR codes** are cryptographically signed using SHA-256 and generated with ZXing. Each drug is tracked individually, enabling partial dispensation across multiple pharmacies.

**Refresh token rotation** — every token refresh issues a new refresh token and revokes the old one, preventing token reuse after logout.

**Role-based routing** — the app automatically routes to the correct screen set (patient, doctor, pharmacist, admin) based on the authenticated user's role.

---

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production-ready. Protected — no direct pushes. |
| `development` | Active integration branch. All PRs merge here. |
| `feat/<name>` | Feature branches off development. |

---

## Known Limitations & Future Enhancements

- **QR code scanning** — pharmacist currently enters prescription ID manually. Camera-based QR scanning is a planned enhancement using `expo-barcode-scanner`.
- **Paystack webhook** — payment integration is complete but webhook testing requires a deployed server (ngrok for local testing). Subscription upgrade flow initiates payment but tier upgrade on successful payment requires webhook to be live.
- **Firebase FCM** — notification service is implemented but requires a Firebase service account JSON file. Push notifications are disabled until credentials are configured.
- **AI integration** — Gemini API key required. Falls back to rule-based classifier if API is unavailable or rate-limited.
- **Password reset** — not yet implemented. Planned for next release.
- **Email verification** — not yet implemented. Planned for next release.
- **NHIS integration** — deferred to future phase per project proposal.

---

## License

Academic project — KNUST, Department of Computer Science, 2025/2026.