# HANDOFF — CryoHealth-api — 2026-08-09 01:20 PKT

Session: hetzner-tunnel-deploy Model: claude-sonnet-5 Branch: main Goal: none Task: none (ad hoc, cross-repo deploy infra)

## State

Fully deployed and live. `api` runs on the Hetzner box (`ubuntu-4gb-hel1-1`,
204.168.190.206) behind the `cryohealth-hetzner` Cloudflare Tunnel, publicly reachable at
`https://api.cryohealth.io` — confirmed via `GET /health` → `{"status":"ok","database":"up"}`.
CD pipeline (`deploy.yml`, workflow_run on green `ci`) ran end-to-end successfully
(`deploy #7`): build → push to GHCR → SSH → `docker compose run --rm api npm run
migration:run` → restart. All 7 migrations applied cleanly against production Postgres
for the first time. GHCR pull auth fixed (user supplied a `read:packages` PAT, `docker
login`'d as the `deploy` user on the server). Two real, previously-latent bugs were
caught and fixed here — see Done this session. **Lakes are seeded in production**
(`npm run seed:lakes` → 6 inserted) and a full observation+hazard pass has been run
against real Sentinel-2 data (triggered from CryoHealth-geo) — `GET
https://api.cryohealth.io/lakes` confirms real tiers (badswat at `high`, etc.), not
defaults.

## Done this session

- Dockerfile: keep ts-node+src in prod image so migrations run from the deployed image
  (8208050)
- deploy.yml: build+push to GHCR, SSH deploy, gated on ci (8208050)
- Fixed the pre-existing lint error blocking ci for 3 commits — removed a redundant `any`
  cast in cases.service.spec.ts since `CasesService.create()` already returns
  `Promise<ChwCase>` (62cbea4)
- **Fixed a real build bug, never caught before because this app had never actually run
  from its built artifact until this session**: `tsconfig.build.json` didn't exclude
  `scripts/`, so tsc's inferred rootDir spanned both `src/` and `scripts/`, nesting
  compiled output under `dist/src/main.js` instead of `dist/main.js`. The pre-existing
  `start:prod` script (`node dist/main`) and this repo's Dockerfile CMD both assumed the
  flat path and would have always crash-looped — confirmed live (`MODULE_NOT_FOUND`) on
  the first real container run. Fixed by excluding `scripts/` from the build (it's run
  via `ts-node` directly, never meant to be compiled) (5905af9)
- **Fixed a second real gap surfaced by actually trying to seed production**: the prod
  Dockerfile copied `dist/`, `src/`, and `tsconfig.json` for migrations, but never
  `scripts/` — so `docker compose run --rm api npm run seed:lakes` failed with
  `MODULE_NOT_FOUND` (ts-node had no `seed-lakes.ts` to find). Fixed by also copying
  `scripts/` into the final image (65efde1)
- GitHub Actions secrets set: DEPLOY_HOST, DEPLOY_USER, DEPLOY_SSH_KEY
- Server: GHCR login configured, migrations run, lakes seeded, `api` container stable and
  serving traffic through the tunnel

## CORS origins hardcoded (2026-08-30)

`src/main.ts:15-19` now hardcodes the allowed CORS origins to:
- `http://localhost:8080`
- `https://cryohealth.io`

This is intentional: server config is not accessible from this session, so the frontend URLs
are hardcoded rather than read from environment variables. If `CORS_ORIGINS` is set and
non-empty in the deployment environment, it still overrides these defaults.

The Expo native app (`cryohealth-app`) is not affected by CORS — native HTTP clients bypass
browser same-origin policy. The web frontend (`cryohealth`) runs on `localhost:8080` in dev
and `https://cryohealth.io` in production, both of which are allowed.

## Not done / deferred

- No automated test exercises the actual built container (only source-level jest via
  ts-jest) — the `dist/main.js` path bug would have been caught by CI if a smoke-test
  step ran the built image; consider adding one
- `Facility.vulnerability` still has no entity mapping (pre-existing gap, noted in an
  earlier session's addendum, not touched here)

## Next action

None blocking. If picking this back up: consider adding a CI step that actually runs
`docker build` + boots the container (`node dist/main.js` + hits `/health`) so a
regression like this session's rootDir bug fails in CI instead of on first deploy.

## Open questions for a human

- none blocking

## Failed approaches (do not retry)

- GitHub Actions "Re-run failed jobs" from the `...`/`Re-run jobs` menu without confirming
  the modal that appears does nothing silently — always screenshot after clicking to
  confirm the "Re-run jobs" dialog actually appeared and was confirmed before assuming a
  re-run happened
- Making the `cryohealth-api`/`cryohealth-geo` GHCR packages public instead of using a PAT
  — blocked by uExel org policy ("Setting is disabled by organization administrators" on
  the package visibility toggle)

## Loops run

- none (ad hoc, no /uexel:plan → /uexel:build loop)

## Files touched

Dockerfile, .github/workflows/deploy.yml (new), src/cases/cases.service.spec.ts,
tsconfig.build.json, docs/ai/LEARNINGS.md

## Verification status

tests: 28/28 passing (jest) lint: clean build: clean review: n/a
deploy: **live and seeded** — https://api.cryohealth.io/health returns 200 with a real DB
connection; https://api.cryohealth.io/lakes returns 6 real lakes with real hazard tiers
from a real Sentinel-2-driven observation+hazard pass

## Resume with

/uexel:orient

## Addendum — 2026-08-29 (TypeScript + test fixes)

Resolved 9 TypeScript compilation errors and 3 failing jest tests.

**Compilation fix:** TypeORM 0.3's strict `_QueryDeepPartialEntity` rejects `Record<string, unknown>` for JSONB columns in `insert()` calls. Changed JSONB column types from `Record<string, unknown>` to `any` in 4 entity files to bypass the overly strict deep-partial mapping. Runtime behavior is unchanged.

**Test fixes:**
- `src/auth/auth.service.ts`: `login()` was throwing `HttpException` but tests expected `UnauthorizedException`; changed to `UnauthorizedException('Wrong ID or PIN')` so `instanceof` and `toThrow` assertions both pass.
- `src/lakes/lakes.service.spec.ts`: `LakesService` now requires `DataSource` for `query`/`transaction`; added a mock `DataSource` provider to the test module.
- `src/cases/cases.service.spec.ts`: Same missing `DataSource` provider issue; added mock.

**Files touched:**
src/alerts/entities/audit-entry.entity.ts, src/alerts/entities/hazard-score.entity.ts,
src/database/entities/sync-log.entity.ts, src/cases/entities/chw-case.entity.ts,
src/auth/auth.service.ts, src/lakes/lakes.service.spec.ts, src/cases/cases.service.spec.ts

**Verification status:**
tests: 28/28 passing build: clean lint: clean
