# CryoHealth API — architecture

NestJS service owning product logic: auth/RBAC, alerts policy, sync, admin, and the
read-only Open Data API. Geospatial/EO computation lives in
[CryoHealth-geo](https://github.com/uExel/CryoHealth-geo) (Python/FastAPI); the two
services share only the PostGIS database. Full system PRD:
[cryo-harness/docs/PRD-cryohealth-prototype-v2.md](https://github.com/uExel/cryo-harness/blob/main/docs/PRD-cryohealth-prototype-v2.md).

```
CryoHealth-geo (Python) ──writes──► PostgreSQL 16 + PostGIS ◄──reads/writes── this service
  observations, hazard_scores            │                     auth · alerts policy · sync
                                         └── one schema, migrations owned HERE (TypeORM)
Consumers: cryohealth (Vite dashboard) · cryohealth-app (React Native CHW app) · public Open Data API
```

## Directory structure

```
src/
  common/          cross-cutting only: RolesGuard, JwtAuthGuard, @Roles(), the
                   Role/Tier/JwtPayload types. Never imports from a feature module.
  config/          single source of truth for env vars, Joi-validated at boot
  database/        DataSource (migration CLI), migrations, DatabaseModule, and
                    entities/  — staged: owned by a feature module that isn't built
                                yet (HazardScore, Alert, Facility, ChwCase, SyncLog,
                                AuditEntry). Moves into its module the day that
                                module's first service lands.
  users/           owns User — the identity domain, separate from auth (which owns
                     entities/    "how do you prove who you are", not "who exists")
  auth/            login, JWT issuance/validation
    dto/  strategies/
  health/          liveness + DB connectivity check
  lakes/           owns Lake + Observation, the paginated read-only Open Data API
    entities/
```

Full reasoning: [docs/ai/decisions/0001-directory-structure.md](docs/ai/decisions/0001-directory-structure.md).

## Decisions that matter

- **Migrations are the only schema authority** (`src/database/migrations`, `synchronize: false`).
  The Python service never migrates; it writes to tables defined here.
- **Tier policy is code + humans, never silent ML**: the geo service computes scores;
  alert creation/override happens here with a mandatory audited reason (`audit` table).
- **Open Data endpoints are unauthenticated by design** — safety info is never gated.
  Everything else requires a JWT; roles are `cryohealth_admin | facility_admin | chw | viewer`
  enforced by `RolesGuard`. No route is public by omission.
- **Offline-first sync**: `chw_cases.clientCaseId` is the idempotency key for
  conflict-safe upsert from devices; `sync_log` records every device sync.
- **Reproducibility**: every observation and hazard score carries a `run_id`; scores keep
  their input `components` as jsonb so any tier can be recomputed from stored inputs.

## Run

```bash
cp .env.example .env   # set JWT_SECRET
docker compose up -d db
npm ci && npm run migration:run && npm run start:dev
# API on :3000, OpenAPI docs on /docs
```
