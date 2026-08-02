# SwiftCare subscription authentication fix

## Why the 403 happened

`JwtFilter` previously ignored invalid or expired Bearer tokens. Spring Security then treated the request as anonymous and returned `403 Forbidden`. The mobile interceptor refreshes sessions only after a `401`, so affected users could never recover automatically.

The updated filter now:

- returns `401 Unauthorized` for expired, malformed, or wrongly signed access tokens;
- allows `/auth/refresh` to run even when the old access token is stale;
- lets the mobile app refresh and retry the subscription request;
- returns explicit JSON for authentication and authorization failures;
- logs a safe JWT signing-key fingerprint at service startup so identity and subscription services can be compared without exposing the secret.

## Apply

Extract this ZIP into:

`C:\Users\danny\OneDrive\Desktop\SwiftCare_Felix`

Replace the existing files.

## Set one JWT secret for every service

In Command Prompt:

```cmd
setx JWT_SECRET replace-with-a-random-secret-at-least-32-bytes-long
```

Close all terminals and open new ones. Start identity-service and subscription-service from new terminals. Their logs must show the same line:

`JWT signing-key fingerprint: <same 12 characters>`

Do not compare or share the secret itself.

## Restart

```cmd
cd C:\Users\danny\OneDrive\Desktop\SwiftCare_Felix\swiftcare-microservices

gradlew :identity-service:clean :identity-service:bootRun
```

In a second terminal:

```cmd
cd C:\Users\danny\OneDrive\Desktop\SwiftCare_Felix\swiftcare-microservices

set PAYSTACK_SECRET_KEY=sk_test_YOUR_KEY
gradlew :subscription-service:clean :subscription-service:bootRun
```

In a third terminal:

```cmd
cd C:\Users\danny\OneDrive\Desktop\SwiftCare_Felix\swiftcare-microservices

gradlew :api-gateway:clean :api-gateway:bootRun
```

## Test affected phones

Users should log out and log in again. If an expired token is still present, the app should now receive `401`, refresh the session, retry the request, and open Paystack checkout.

The subscription plans endpoint is now public, while upgrade, verification, status, and cancellation remain restricted to authenticated patients.
