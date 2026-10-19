# ADR 0003 — Alert push delivery uses Firebase and a durable device queue

## Status

Implemented for Android FCM. Email and iOS/APNs delivery are not configured.

## Context

Alerts were initially only written to the database and logged by
`LogNotificationChannel`. That was an intentional stub while device registration and
Firebase credentials were unavailable. The mobile app now registers guest-capable
native FCM tokens, and the backend uses the Firebase Admin SDK.

## Decision

- Keep push tokens in `push_devices`, independent of `users`, so guests can receive
  every newly created alert.
- Insert one `push_deliveries` row for each active device in the same database
  transaction as the alert. This is the durable per-device outbox; alert commits do not
  wait for Firebase.
- A worker claims jobs with `FOR UPDATE SKIP LOCKED`, sends FCM multicast batches,
  retries transient failures with capped exponential backoff, and disables invalid
  tokens. Terminal outcomes and error codes remain inspectable in the database.
- Only newly inserted alerts are broadcast. Dedupe prevents duplicate delivery jobs;
  edits, overrides, and clears do not currently send push updates.
- Store the Firebase Admin credential outside source control, as three environment
  variables: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`
  (newlines written as literal `\n`). The Android `google-services.json` is app/build
  configuration, not the Admin credential.
- Tapping a push fetches the alert from the public API, caches it, then opens its detail
  screen. No change to the app's read-through database schema is needed.

## Consequences

- Run the TypeORM migration before deploying the API and set the three `FIREBASE_*`
  variables in the production `.env`; production refuses to boot without them.
- Provide the Android Firebase config file to local and EAS builds; the package name
  must match `com.uexel.cryohealth`.
- iOS requires a Firebase iOS app plus APNs credentials before push delivery can be
  relied on there.
- Delivery is at-least-once: a worker crash after Firebase accepts a send but before
  the database marks it sent can produce a duplicate notification.
