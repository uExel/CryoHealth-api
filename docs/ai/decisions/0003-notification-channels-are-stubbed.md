# ADR 0003 — Notification delivery is a logged stub, not faked FCM/email

## Context
Task #8's acceptance criteria say alerts are "delivered in-app + FCM push + email." No
FCM project, service account, or email provider (SES/SendGrid/etc.) exists anywhere in
this project — not in `.env.example`, not in any config, not mentioned as arranged
anywhere in the PRD's week-1/2 plan. cryohealth-app also has no device-token
registration wired up yet (it's still on `src/lib/mock.ts`).

## Decision
Ship a real `NotificationChannel` interface with multi-channel fan-out, and exactly one
implementation: `LogNotificationChannel`, which logs precisely who would have been
notified and for what, rather than a class that claims to call Firebase/an email API
with no credentials to actually do so. That would be undemonstrable code pretending to
work — worse than admitting the gap.

In-app delivery is real, not stubbed: `GET /alerts` is a genuine, live, paginated feed —
that's the one channel this task fully delivers.

## Consequences
- Adding real FCM or email later is additive: implement `NotificationChannel`, add the
  class to `AlertsModule`'s `NOTIFICATION_CHANNELS` provider array. `AlertsService`
  never changes — it already fans out to every registered channel.
- Recipient computation (`AlertsService.recipientsFor`) is real and tested — the gap is
  purely the last-mile delivery mechanism, not who should be notified.
- Verified live: a tier transition on Shishper correctly identified and logged its one
  mapped CHW (Zainab Karim, via `Facility.lakeId` -> `User.facilityId`) by name on both
  the initial alert and a subsequent override — the routing logic this task actually
  owns works end to end; only the transport is stubbed.
