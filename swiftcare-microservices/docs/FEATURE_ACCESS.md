# SwiftCare feature access

## Patient tiers

| Capability | Free | Premium | Enforcement |
|---|:---:|:---:|---|
| Patient profile and health profile | Yes | Yes | Authenticated patient |
| AI symptom assessment and first-aid guidance | Yes | Yes | Authenticated patient |
| Hospital appointment booking | Yes | Yes | Authenticated patient |
| Queue position and status tracking | Yes | Yes | Record ownership |
| Medical history | Yes | Yes | Patient ownership |
| Prescriptions and QR display | Yes | Yes | Patient ownership |
| Laboratory results | Yes | Yes | Patient ownership |
| Notifications | Yes | Yes | Patient ownership |
| View/cancel existing online consultation records | Yes | Yes | Patient ownership; cancellation is preserved after a plan ends |
| Browse doctors available for online consultation | No | Yes | Token tier plus active subscription record |
| Book an online video consultation | No | Yes | Token tier plus active subscription record |
| Join or rejoin the video room | No | Yes | Active subscription, ownership, status, and 15-minute join window |
| Queue tie-break priority at equal clinical severity | No | Yes | Server-side queue ordering |

Premium never overrides clinical urgency. Severity is sorted first. The tier is used only when severity is equal.

## Why two entitlement checks are used

The JWT contains a tier claim for quick authorization, but a token can remain valid briefly after a plan is cancelled or expires. Premium consultation endpoints therefore also query the current subscription row and require all of the following:

- the patient record is Premium;
- the subscription status is ACTIVE;
- the expiry time is later than the current database time.

This closes the stale-token loophole. The mobile app reads the same status endpoint so locked controls match server behavior, but the server remains the final authority.

## Consultation lifecycle

| State | Patient actions | Doctor actions |
|---|---|---|
| SCHEDULED, earlier than 15 minutes before start | Cancel | Wait |
| SCHEDULED, inside the 15-minute window | Join or cancel | Join |
| IN_PROGRESS | Rejoin | Rejoin, record findings, complete |
| COMPLETED | View record | View record |
| CANCELLED | View status | View status |

A consultation cannot be completed from SCHEDULED or CANCELLED. Camera and microphone permission must be granted before the mobile app requests entry to a room, and room URLs must use HTTPS.