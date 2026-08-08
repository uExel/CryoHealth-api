# HANDOFF — CryoHealth-api — 2026-08-08 21:20 PKT

Session: live-data-wiring Model: claude-sonnet-5 Branch: main Goal: none Task: none (ad hoc)

## State

Two batches of uncommitted work sit in this working tree. First, pre-existing (from a
prior Copilot Chat session, not this one): CORS (`main.ts`, `CORS_ORIGINS` config), a full
`cases` feature module (`src/cases/` — controller/service/dto/entity, idempotent
`POST /cases` upsert by `clientCaseId`, paginated `GET /cases`, `@Roles('chw')`,
registered in `app.module.ts`), and `scripts/seed-users.ts` (idempotent dev-login seed).
`ChwCase`'s entity moved out of `database/entities/` staging into `cases/entities/` as
part of that, per ADR 0001's stated policy. Build clean, all tests passing before this
session started.

Second, this session: added `Alert.chips`/`Alert.checklist` (nullable jsonb string[]) so
CryoHealth-app's mobile screens can show real action tags/checklists instead of static
mock copy — new migration `1786204276808-AlertChipsAndChecklist`, threaded through
`IssueAlertDto` and `alerts.service.ts#issueManual` so a human issuing an alert can set
them. Nullable and unbackfilled on existing rows by design — no fabricated content on
alerts that predate the column. `npm run build` and the full jest suite (28 tests) pass.
**The migration has never been run against a live Postgres** — no Docker in this dev
environment, so this is unverified against a real schema.

Both batches are now committed as one commit, `a70791c` "feat: mobile CHW case sync,
CORS, and alert chips/checklist" — the earlier "commit as one PR or two" question below
was answered by just committing together, same as CryoHealth-app.

## Done this session

- `src/alerts/entities/alert.entity.ts`: added `chips`/`checklist` (jsonb, nullable)
- `src/database/migrations/1786204276808-AlertChipsAndChecklist.ts` (new)
- `src/alerts/dto/issue-alert.dto.ts`: optional `chips`/`checklist` string[] fields
- `src/alerts/alerts.service.ts#issueManual`: passes `dto.chips`/`dto.checklist` through
  to `insertAlert`
- Verified: `npm run build` clean, `npx jest alerts cases` (12/12) then full suite (28/28)
  passing — no live-DB verification (see State)
- `CLAUDE.md` updated with the new columns
- Committed this repo's full working tree (pre-existing cases/CORS/seed-users work +
  this session's alert-column work) as `a70791c`, on top of the earlier docs-only
  handoff commit `a281fb3`

## Not done / deferred

- Running the new migration against a real Postgres — needs Docker, not available here
- No endpoint/UI exists yet to let the `cryohealth` web dashboard author chips/checklist
  when issuing an alert from there — only `IssueAlertDto` (this API) supports it so far

## Next action

`docker compose up -d db && npm run migration:run` on a Docker-capable machine to
actually apply `AlertChipsAndChecklist`, then `npm run seed:lakes && npm run seed:users`
and a manual `POST /alerts` with `chips`/`checklist` set, to confirm the column
round-trips — none of this has been verified against a live database yet, despite being
committed.

## Open questions for a human

- Should chip/checklist authoring also be exposed via `PATCH /alerts/:id` (override), or
  only at issue time? — blocking: no

## Failed approaches (do not retry)

- none this session

## Loops run

- none (ad hoc, no /uexel:plan → /uexel:build loop)

## Files touched

src/alerts/entities/alert.entity.ts, src/alerts/dto/issue-alert.dto.ts,
src/alerts/alerts.service.ts, src/database/migrations/1786204276808-AlertChipsAndChecklist.ts
(new), CLAUDE.md, docs/ai/HANDOFF.md
(pre-existing, not this session: .env.example, package.json, src/app.module.ts,
src/config/configuration.ts, src/config/validation.schema.ts, src/database/all-entities.ts,
src/main.ts, src/cases/, scripts/seed-users.ts)

## Verification status

tests: 28/28 passing build: clean migration: applied and live-verified (see 2026-08-08
addendum) — GET /lakes, GET /alerts, and a full POST /alerts chips/checklist round-trip
all confirmed against a real Postgres commits: `a70791c`, `400b494`

## Resume with

/uexel:orient (then: run CryoHealth-app against this backend on a device/simulator —
the backend is now confirmed working, but the mobile wiring from the prior session has
never actually been exercised end to end)

## Addendum — 2026-08-03 (harness maintenance)

cryo-harness renamed to uxl-harness across the org (github.com/uExel/uxl-harness); this repo's .claude/settings.json marketplace pointer updated to match.

## Addendum — 2026-08-08 (migration verification, Docker became available)

Docker became available in this environment later in the same session. Ran
`docker compose up -d db` (fresh Postgres, first time any migration had ever
run against a live instance) and `npm run migration:run` — all 7 migrations,
including `AlertChipsAndChecklist`, applied cleanly.

**Verifying it surfaced a real, pre-existing bug, unrelated to chips/checklist**:
`GET /lakes` and `GET /alerts` both 500'd with `column Lake.districtId does not
exist`. The WebSchema migration added `district_id`/`current_risk_score`/
`downstream_population`/`area_km2` (Lake) and `district_id`/`body_en`/`body_ur`/
`estimated_window`/`affected_population` (Alert) via raw SQL as snake_case
columns, but the entities were never given explicit `@Column({ name: ... })`
mappings — TypeORM defaulted to looking for the literal camelCase property
name. This had never been caught because no prior session had a live,
migrated database to boot the app against. Fixed in `400b494` (9 fields
across `Lake`/`Alert`). `Facility.vulnerability` (also added by WebSchema) has
the same gap but doesn't crash anything since the entity just doesn't declare
that property at all — not fixed, flagged as a minor follow-up.

Re-verified live after the fix: seeded lakes+users, booted the app, `GET
/lakes` and `GET /alerts` both 200, and a full `POST /alerts` → `GET
/alerts/:id` → feed round-trip with real `chips`/`checklist` values, all
correct. Test alert deleted afterward; local `.env` created for this
(gitignored, not committed) with generated `JWT_SECRET`/`GEO_SERVICE_API_KEY`.

## Not done / deferred (added this addendum)

- `Facility.vulnerability` has no entity mapping (WebSchema added the column,
  entity was never updated) — doesn't crash, just inaccessible via this API
- CryoHealth-app's mobile wiring (prior session) has still never actually been
  run against this now-working backend on a device/simulator
