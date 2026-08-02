# ADR 0001 — Directory structure: feature modules + common/ + a database staging area

## Context
The initial NestJS scaffold (task #4) put all nine entities in one flat `src/entities/`
folder and left RolesGuard, the `@Roles()` decorator, and JwtAuthGuard inside `src/auth/`
— not because auth is a natural home for them, but because that's where they were first
written. Config defaults (`DB_PORT`) were declared in three separate files and had
already drifted once. This repo is being open sourced, so the layout needs to read as a
decision, not an accident.

## Decision
- **Feature modules own their entities.** `lakes/` owns `Lake` + `Observation`, `users/`
  owns `User`. A module gets an `entities/` (and `dto/`) subfolder once it exists.
- **Entities without an owning module yet stay in `database/entities/`** — a labeled
  staging area, not a permanent home. `HazardScore`, `Alert`, `Facility`, `ChwCase`,
  `SyncLog`, `AuditEntry` move into their feature module the day that module's first
  service lands (hazard tiering, alerts, facilities, CHW sync — see the PRD tracking
  map in cryo-harness for which task builds each one).
- **`common/`** holds only what's genuinely cross-cutting today: `RolesGuard`,
  `JwtAuthGuard`, the `@Roles()` decorator, and the `Role` / `Tier` / `JwtPayload` types
  every module will reference. Nothing speculative — if only one module used it, it
  would live in that module.
- **`config/`** is the single source of truth for env vars, Joi-validated at boot
  (`validation.schema.ts`) so a missing `JWT_SECRET` fails loudly at startup instead of
  producing a confusing 500 later, and so a default only needs to change in one place.
- **`database/`** holds the DataSource (migration CLI entrypoint), migrations, and
  `DatabaseModule` — one TypeORM configuration, not duplicated between the CLI and the
  running app.

## Consequences
- Adding a feature module later is: `git mv` its entity file(s) out of
  `database/entities/`, write the module. No refactor of what already exists.
- Dependency direction is one-way: `common/` never imports from a feature module.
  `JwtPayload` was deliberately moved out of `auth/auth.service.ts` into
  `common/types/` for exactly this reason — `RolesGuard` needed it, and having
  `common/` reach back into `auth/` for a type would have broken the rule the first
  week it existed.
- `database/all-entities.ts` is the one place every entity is imported together, purely
  because TypeORM's `DataSource` requires a single flat array. It is not a second
  source of truth — it re-exports from each entity's real home.
- Verified with a full boot (not just unit tests, which mock every provider and
  wouldn't have caught a wiring mistake in `AppModule`/`DatabaseModule`): `GET /health`
  returned `{"status":"ok","database":"up"}`, `GET /docs` returned 200, `GET /lakes`
  returned a valid paginated empty result.
