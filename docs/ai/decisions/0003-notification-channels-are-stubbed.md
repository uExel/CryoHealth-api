# ADR 0003 — Alert push delivery uses Firebase and a durable device queue

## Status

Android FCM and SMTP email use durable per-recipient outboxes. SMTP settings are
required in production, and alert emails are queued for active, mapped CHWs with an
email address. The geo hazard model still has no forecast source; automatic impact
windows are populated only when the geo caller supplies source-backed values.
iOS/APNs delivery is not configured.

## Context

Alerts were initially only written to the database and logged by
`LogNotificationChannel`. That was an intentional stub while device registration and
Firebase credentials were unavailable. The mobile app now registers guest-capable
native FCM tokens, and the backend uses the Firebase Admin SDK.

## Decision

- Keep push tokens in `push_devices`; guest tokens remain unlinked, while an
  authenticated CHW/facility-admin device can be linked to its user.
- Store optional CHW email addresses on `users`. Queue one email per active mapped CHW
  with an address in the alert transaction; the SMTP worker retries transient failures
  with capped backoff. The address and message are snapshotted for the delivery record.
- Insert one `push_deliveries` row for each active device in the same database
  transaction as the alert. This is the durable per-device outbox; alert commits do not
  wait for Firebase.
- For lake-specific alerts, queue deliveries only for linked devices whose active user
  belongs to a facility mapped to that lake. Alerts without a lake remain broadcast to
  all active devices; unlinked guest devices do not receive lake-specific alerts.
- A worker claims jobs with `FOR UPDATE SKIP LOCKED`, sends FCM multicast batches,
  retries transient failures with capped exponential backoff, and disables invalid
  tokens. Terminal outcomes and error codes remain inspectable in the database.
- New alerts and audited tier overrides are broadcast. Dedupe prevents duplicate jobs
  for repeated hazard-score reports; edits to body/window and clears do not send updates.
- `estimatedWindow`, `windowStart`, `windowEnd`, and downstream summary are part of the
  alert-feed response and email body. The geo client can forward source-provided windows;
  the current hazard model does not forecast impact times, so it must not fabricate one.
- Store the Firebase Admin credential outside source control, as three environment
  variables: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`
  (newlines written as literal `\n`). The Android `google-services.json` is app/build
  configuration, not the Admin credential.
- Tapping a push fetches the alert from the public API, caches it, then opens its detail
  screen. No change to the app's read-through database schema is needed.

## Consequences

- Run the TypeORM migration before deploying the API and set the three `FIREBASE_*`
  variables in the production `.env`; production refuses to boot without them.
- Set `SMTP_HOST`, `SMTP_FROM`, `SMTP_PORT`, and `SMTP_SECURE` for production; if the
  relay authenticates, set both `SMTP_USER` and `SMTP_PASSWORD`. Add actual CHW email
  addresses through the admin user screen. Missing CHW addresses are logged and those
  recipients are not queued.
- Provide the Android Firebase config file to local and EAS builds; the package name
  must match `com.uexel.cryohealth`.
- Run the push-device user-link migration and deploy the matching app registration
  update before expecting lake-specific alerts to reach CHWs.
- iOS requires a Firebase iOS app plus APNs credentials before push delivery can be
  relied on there.
- Delivery is at-least-once: a worker crash after Firebase accepts a send but before
  either FCM or SMTP accepts a send but before the database marks it sent can produce a
  duplicate notification.
