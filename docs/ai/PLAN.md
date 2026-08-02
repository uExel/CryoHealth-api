# PLAN — CryoHealth-api#4: NestJS + Postgres/PostGIS + JWT auth/RBAC scaffold
Goal: #1 (G1 milestone) · Task: #4 · Loop budget: 3 · Rollback: revert the PR; db volume is disposable

Steps (one atomic commit each, verification per step):
1. NestJS 11 scaffold (CLI), strict TS, jest — verify: `npm run build && npm test`
2. docker-compose (postgis/postgis:16-3.4) + TypeORM datasource + initial migration
   creating the §6 schema (lakes, observations, hazard_scores, alerts, facilities,
   users, chw_cases, sync_log, audit; PostGIS geometry on lakes/facilities)
   — verify: `docker compose up -d db && npm run migration:run`
3. Auth: JWT login (bcryptjs), roles cryohealth_admin/facility_admin/chw/viewer,
   @Roles decorator + RolesGuard — verify: `npm test` (auth.service + roles.guard units)
4. Health + lakes read endpoints (GET /health, /lakes, /lakes/:id) — verify: `npm test && npm run build`
5. CI: lint+build+test workflow — verify: `npm run lint && npm test`

Assumptions (would change the plan if wrong): TypeORM (the task's verification command
says `migration:run`); bcryptjs over argon2 (no native build on CI); seed/inventory is
task #5, NOT here. Blast radius: greenfield — no consumers yet; users table stores
password hashes (auth-sensitive → /cso at verify). GATE: approved by Shaan's direct
instruction 2026-08-01 ("start the NestJS scaffold task") — greenfield blast radius.
