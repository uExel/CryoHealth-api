# HANDOFF — CryoHealth-api — 2026-11-04

Session: issue-2-fork-prs Branch: fix/issue-2-alert-notifications Task: open mobile/geo PRs without upstream write access

## Current state

PR #31 is open and ready for review against `main`: https://github.com/uExel/CryoHealth-api/pull/31
It is not merged. API CI passes. Dashboard PR #77 is open and its build and handoff
checks pass. Mobile PR #7 and geo PR #27 are open from personal forks; neither is merged.

## Done this session

- Added authenticated push-device linking, lake-scoped push queueing, actual downstream facility summaries, and coverage.
- Added CHW email addresses to user administration and a durable SMTP outbox/worker with retries; tier overrides through both admin routes are reason-required, audited, and re-notified.
- Added optional source-provided impact-window fields to the hazard-score API/geo client contract and mobile offline cache/display. No automatic impact window is fabricated because the current hazard model has no forecast source.
- API build, changed-file ESLint, and full Jest suite passed after the final override hardening (63 tests).
- Dashboard email-entry and reason-required tier-edit changes are in PR #77 (`uExel/cryohealth#77`); build and handoff checks pass.
- Re-verified mobile typecheck and 7 focused alert/API + migration tests; changed-file ESLint passed.
- Re-verified geo impact-window tests (5) and Ruff.
- Created personal forks and opened mobile PR #7 against `shabir_dev` and geo PR #27 against `main`.
- Fork PR workflows are awaiting GitHub maintainer approval (`action_required`); no CI jobs have run yet.

## Not done / external deployment requirements

- SMTP delivery requires production `SMTP_*` settings and actual CHW email addresses; no credentials or recipient addresses are committed.
- The current geo hazard pipeline has no impact forecast. It accepts and forwards source-provided windows, but automated transitions will have no impact window until a real forecast source is supplied.
- A maintainer must approve the fork PR workflows and review the mobile, geo, API, and dashboard PRs.
- Leave issue #2 open until configured delivery and source-backed windows are verified end to end.

## Next action

Ask a maintainer to approve the mobile and geo fork PR workflows, then review CI and keep issue #2 open until production email and end-to-end delivery are verified.

---

## Previous handoff — 2026-10-16

Session: push-notifications Model: claude-sonnet-5-5 Branch: feat/push-notifications Goal: none Task: none (FCM push for new alerts; PR #27)

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

tests: 55/55 tsc: clean lint: not run review: none qa: FCM dry-run auth OK; no device push sent; `npm ci --dry-run` OK

## Resume with

/uexel:orient (then: gh pr view 27 --repo uExel/CryoHealth-api)
