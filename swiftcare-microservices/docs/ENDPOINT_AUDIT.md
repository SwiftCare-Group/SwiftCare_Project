# Endpoint audit

## Static contract

The backend contains 18 REST controllers and 79 HTTP handler methods across identity, appointment, clinical, symptom, subscription, and notification services.

The gateway contract test loads the real application configuration and verifies all 14 route definitions:

- six health/wake routes;
- identity;
- appointment and appointment-admin;
- clinical and clinical-admin;
- symptom;
- subscription;
- notification.

Every mobile API prefix is routed through the gateway. Internal notification endpoints remain intentionally private and use the service-to-service key rather than the public gateway.

## Automated verification completed

| Check | Result |
|---|---|
| All Gradle modules compile on Java 21 | Pass |
| Full backend clean test task | Pass |
| Gateway route configuration loads | Pass |
| All public and health route destinations | Pass |
| Consultation entitlement and ownership cases | Pass |
| Join-window and lifecycle cases | Pass |
| Mobile TypeScript type-check | Pass |
| Expo SDK 54 public config resolution | Pass |
| Expo web production bundle | Pass |
| Known embedded credential scan | Pass |

## Live integration boundary

A true response-level test of all 79 handlers needs a migrated PostgreSQL database plus test users for Patient, Doctor, Pharmacist, Laboratory, and Admin roles. Docker and PostgreSQL were not available in the repair environment, so destructive live mutations such as payment verification, prescription dispensing, queue transitions, and administrator account creation were not sent to an external deployment.

Before production release, run the stack from a fresh database and exercise those role workflows through the mobile app. Paystack webhook verification must use Paystack test mode and a configured test signing key.