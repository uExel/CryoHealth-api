# HANDOFF — CryoHealth-api — 2026-10-16 15:11 PKT
Session: push-notifications  Model: claude-sonnet-5-5  Branch: feat/push-notifications  Goal: none  Task: none (FCM push for new alerts; PR #27)

## State
PR #27 open against main, not merged or deployed. It adds Firebase Cloud Messaging push for newly created alerts:
- `push_devices` (guest-capable device tokens) and `push_deliveries` (per-device outbox, inserted in the same transaction as the alert), via two migrations;
- a worker that claims jobs with `FOR UPDATE SKIP LOCKED`, sends FCM multicast batches, retries with capped backoff and disables invalid tokens;
- Firebase Admin credentials now come from env vars `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (newlines as literal `\n`) instead of a JSON file. **Production refuses to boot without all three.**

## Done this session
- Built the push module, migrations, device registration endpoint (throttled) and `npm run push:test`
- Replaced `FIREBASE_SERVICE_ACCOUNT_PATH` with the three env vars; shared loader in `src/push/firebase-credential.ts`, required in production by the Joi schema
- Verified the three vars authenticate with FCM via a dry-run send (nothing delivered)
- Updated ADR 0003; added `firebase-admin` and `@nestjs/throttler`; `secrets/` gitignored
- Opened PR #27 from a fresh branch off origin/main

## Not done / deferred
- Server not configured: `/opt/cryohealth/.env` needs the three `FIREBASE_*` vars, and `docker-compose.prod.yml` (lives on the server, not in the repo) must load it via `env_file:`. Do this before merging.
- No real push has been sent to a device; run `npm run push:test` after deploy.
- iOS/APNs and email delivery are not configured. Edits, overrides and clears do not send push updates.
- Delivery is at-least-once: a crash after FCM accepts but before the DB marks it sent can duplicate a notification.
- `docker-compose.prod.yml` and `deploy.sh` are not version controlled; consider adding them under `deploy/`.
- Glacier seed work stays on `fix/14-glacier-rgi-seed`; not part of this PR.

## Next action
gh pr view 27 --repo uExel/CryoHealth-api

## Open questions for a human
- Does `docker-compose.prod.yml` already use `env_file:` for the api service? — blocking: yes (merge would crash-loop the API if not)
- Should the compose file and `deploy.sh` be added to the repo? — blocking: no

## Failed approaches (do not retry)
- Pasting the whole service-account JSON into a single env var — multi-line key and quotes get mangled by `.env`/`env_file` parsing; use the three-field form.
- Running `tsc`-based check scripts from outside the repo via ts-node — module resolution fails; use a CommonJS script with `createRequire` against the repo's package.json.

## Loops run
- none

## Files touched
src/push/ (new module: service, worker, controllers, entities, dto, firebase-credential.ts), src/database/migrations/1791890000000-AddPushDevicesAndDeliveries.ts, src/database/migrations/1792000000000-PushDeliverySnapshotAndIosPlatform.ts, src/alerts/ (module, service, spec, notification channel), src/config/configuration.ts, src/config/validation.schema.ts, src/database/all-entities.ts, scripts/send-test-push.ts, .env.example, .gitignore, package.json, package-lock.json, docs/ai/decisions/0003-notification-channels-are-stubbed.md, docs/ai/HANDOFF.md, docs/ai/sessions/2026-09-27-alert-broadcast-fix-handoff.md

## Verification status
tests: 55/55  tsc: clean  lint: not run  review: none  qa: FCM dry-run auth OK; no device push sent; `npm ci --dry-run` OK

## Resume with
/uexel:orient   (then: gh pr view 27 --repo uExel/CryoHealth-api)
