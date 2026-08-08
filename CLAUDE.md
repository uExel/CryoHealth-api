# CryoHealth-api

NestJS service owning CryoHealth's product logic — auth/RBAC, alert & tier policy,
offline CHW sync, and the public read-only Open Data API — over a PostGIS database
shared with CryoHealth-geo. Full architecture: [ARCHITECTURE.md](ARCHITECTURE.md).

## Working here

- Start sessions with /uexel:orient, end with /uexel:handoff. Pipeline:
  orient → plan → gate → build → verify → report → handoff (docs: uExel/cryo-harness).
- Task state lives in GitHub issues — labels + milestones, no boards.
- Shared AI working files: docs/ai/ (PLAN, TODO, HANDOFF, LEARNINGS, sessions, decisions).

## Map

<!-- One line per top-level folder whose purpose a newcomer can't infer from its name.
     Delete rows that are obvious — every line here loads in every session. -->

- `src/common/` — cross-cutting only (RolesGuard, JwtAuthGuard, `@Roles()`, the
  Role/Tier/JwtPayload types). Never imports from a feature module — see
  [docs/ai/decisions/0001-directory-structure.md](docs/ai/decisions/0001-directory-structure.md).
- `src/database/entities/` — a labeled staging area, not a home: entities without an
  owning feature module yet (currently `Facility`, `SyncLog`). Moves into its module the
  day that module's first service lands. `database/all-entities.ts` re-exports every
  entity into one flat array purely because TypeORM's DataSource requires it — not a
  second source of truth.
- `src/lakes/`, `src/alerts/`, `src/cases/`, `src/users/`, `src/auth/` — feature modules;
  each owns its own `entities/`/`dto/` once it exists (`lakes` = Lake+Observation+Open
  Data API, `alerts` = HazardScore/Alert/AuditEntry + notification fan-out, `cases` =
  ChwCase offline sync, `users` = identity, `auth` = login/JWT issuance).
- `src/alerts/notifications/` — `NotificationChannel` interface with one real
  implementation, `LogNotificationChannel` (logs who _would_ be notified). No FCM/email
  provider is wired up — see
  [docs/ai/decisions/0003-notification-channels-are-stubbed.md](docs/ai/decisions/0003-notification-channels-are-stubbed.md).
  In-app delivery (`GET /alerts`) is real; only push/email transport is stubbed.
- `scripts/` — `seed-lakes.ts` (idempotent, upserts by `Lake.slug`), `seed-users.ts`,
  `verify-lakes.ts` (hard-fails on a missing citation or invalid geometry; the "≥25
  lakes" target is a tracked note, not a hard gate — see ADR 0002 below).
- `Alert.chips`/`Alert.checklist` (jsonb string[], nullable) — short action tags and a
  numbered action list for the mobile alert card/critical screen, settable via
  `IssueAlertDto` when a human issues an alert. Optional and unbackfilled on existing
  rows by design (added 2026-08, migration `AlertChipsAndChecklist`) — CryoHealth-app
  renders their absence as "not provided", never a placeholder.

## Gotchas

<!-- Only repo-wide traps that bite in ANY directory. Local conventions and test/lint
     commands go in that directory's own CLAUDE.md. Date rules that exist to work around
     a current limitation: "added YYYY-MM for <x> — re-evaluate on next model release". -->

- **Migrations are the only schema authority** (`synchronize: false`). CryoHealth-geo and
  the `cryohealth` dashboard both read/write this same database but never migrate it —
  every schema change happens here, in `src/database/migrations`.
- **Tier/alert policy is code + humans, never silent ML**: CryoHealth-geo computes hazard
  scores; creating or overriding an alert here requires a mandatory audited reason
  (`audit` table via `AuditEntry`).
- **Open Data endpoints are unauthenticated by design** — safety info is never gated.
  Every other route requires a JWT and passes `RolesGuard`
  (`cryohealth_admin | facility_admin | chw | viewer`); no route is public by omission.
- **`GEO_SERVICE_API_KEY`** gates the one inbound service-to-service call
  (`POST /alerts/hazard-scores`, `x-api-key` header) and must exactly match
  CryoHealth-geo's `CRYOHEALTH_API_KEY`. The `cryohealth` dashboard's `JWT_SECRET` must
  also exactly match this repo's — both mint/verify tokens against the same secret, so a
  token issued by either service is valid on the other.
- **Lake data is a deliberately small, citation-verified subset** (6 lakes, not the
  eventual 25+): every `Lake` row requires `source`/`sourceUrl`; nothing is padded with
  fabricated coordinates to hit a numeric target — see
  [docs/ai/decisions/0002-lake-data-provenance.md](docs/ai/decisions/0002-lake-data-provenance.md).
- **Offline-first sync**: `chw_cases.clientCaseId` is the idempotency key for
  conflict-safe upsert from devices; `sync_log` records every device sync.
- **Reproducibility**: every observation and hazard score carries a `run_id`; scores keep
  their input `components` as jsonb so any tier can be recomputed from stored inputs.
- Local Postgres runs on **port 5433**, not 5432 (`docker compose up -d db`; leaves room
  for a locally installed Postgres) — the `cryohealth` dashboard's `.env` must match.

## gstack (REQUIRED — global install)

**Before doing ANY work, verify gstack is installed:**

```bash
test -d ~/.claude/skills/gstack/bin && echo "GSTACK_OK" || echo "GSTACK_MISSING"
```

If GSTACK_MISSING: STOP. Do not proceed. Tell the user:

> gstack is required for all AI-assisted work in this repo.
> Install it:
>
> ```bash
> git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
> cd ~/.claude/skills/gstack && ./setup --team
> ```
>
> Then restart your AI coding tool.

Do not skip skills, ignore gstack errors, or work around missing gstack.

Using gstack skills: After install, skills like /qa, /ship, /review, /investigate,
and /browse are available. Use /browse for all web browsing.
Use ~/.claude/skills/gstack/... for gstack file paths (the global path).

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
