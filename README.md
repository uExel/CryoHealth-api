# CryoHealth-api

NestJS + PostgreSQL/PostGIS backend for CryoHealth, a glacial-lake outburst (GLOF)
early-warning system for northern Pakistan. It owns the product logic: login and roles,
alert and tier policy, offline sync for community health workers (CHWs), the admin
endpoints, and a public read-only **Open Data API** (lakes, alerts, protocols).

The satellite and hazard-score computation lives in a separate service,
[CryoHealth-geo](https://github.com/uExel/CryoHealth-geo). The two services share one
database; the schema is owned by this repo (see [ARCHITECTURE.md](ARCHITECTURE.md)).

## Run it with one command

You need [Docker](https://docs.docker.com/get-docker/) (with Docker Compose) and `git`.
Nothing else has to be installed.

```bash
git clone https://github.com/uExel/CryoHealth-api.git
cd CryoHealth-api
docker compose --profile full up --build
```

The first run downloads and builds everything, so it takes a few minutes. It starts, in
order:

1. `db`: PostgreSQL 16 + PostGIS.
2. `migrate`: creates the tables, then loads the 6 real, cited lakes and the test logins.
   It runs once and exits (that is normal).
3. `api`: the API, on <http://localhost:3000>.

Ports used on your machine: `3000` (API) and `5433` (database). Stop whatever uses them
first, or change the left-hand number of `ports:` in `docker-compose.yml`.

To stop it: `Ctrl+C`. To stop it **and delete the database**: `docker compose --profile full down -v`.
Running `up` again on an existing database is safe.

> **This is a demo stack, not a deployment.** `docker-compose.yml` runs the API with fixed,
> public, development-only secrets and without Firebase credentials, so **push
> notifications are not sent**. Everything else works. Do not use it as a real server.

## Check that it works

```bash
curl http://localhost:3000/health        # {"status":"ok","database":"up"}
curl http://localhost:3000/lakes         # the 6 seeded lakes
```

Interactive API documentation (Swagger): <http://localhost:3000/docs>

## Test logins

The `migrate` step creates these logins (`scripts/seed-users.ts`). They are fixed
development logins; the PINs are in that file.

| Login (`identifier`) | Role | Can do |
|---|---|---|
| `admin-001` | `cryohealth_admin` | everything, including users, protocols, system health |
| `facility-001` | `facility_admin` | issue, edit, clear and acknowledge alerts; other changes (districts, glaciers, protocols, facilities, CHW profiles, users) need `cryohealth_admin` |
| `chw-001` | `chw` | community health worker (mobile app); can acknowledge alerts |

Log in with `POST /auth/login` and body `{"identifier": "...", "password": "<PIN>"}`. Use
the returned `accessToken` as `Authorization: Bearer <token>`.

## Public endpoints (no login)

These are open on purpose: safety information is never behind a login.

| Endpoint | What it returns |
|---|---|
| `GET /health` | liveness and database check |
| `GET /lakes`, `GET /lakes/:id`, `GET /lakes/:id/detail` | lakes with current tier and score |
| `GET /hot-lakes` | lakes ranked by current risk |
| `GET /lakes/:id/observations` | satellite observations of a lake (paginated) |
| `GET /alerts`, `GET /alerts/:id` | alerts |
| `GET /protocols`, `GET /protocols/:id` | response protocols |

Everything else needs a login and the right role (`cryohealth_admin`, `facility_admin`,
`chw`, `viewer`).

## Run it for development

Run only the database in Docker and the API on your machine (needs Node.js 22):

```bash
cp .env.example .env                 # then set JWT_SECRET and GEO_SERVICE_API_KEY
docker compose up -d db              # PostgreSQL + PostGIS on localhost:5433
npm ci
npm run migration:run                # create the tables
npm run seed:lakes && npm run seed:users
npm run start:dev                    # API on :3000, docs on /docs
```

Tests: `npm test` (unit tests), `npm run test:e2e`. Lint: `npm run lint`.

## Settings (environment variables)

All are checked when the API starts; a missing required one stops it with a clear message.
See [.env.example](.env.example).

| Variable | Needed | Notes |
|---|---|---|
| `JWT_SECRET` | always | at least 16 characters |
| `GEO_SERVICE_API_KEY` | always | at least 32 characters; must equal CryoHealth-geo's `CRYOHEALTH_API_KEY` |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | when `NODE_ENV=production` | credentials for push notifications |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | optional | defaults match `docker-compose.yml` (port `5433` from your machine) |
| `CORS_ORIGINS` | optional | comma-separated browser origins allowed to call the API |

## More documentation

- [ARCHITECTURE.md](ARCHITECTURE.md): how the system is put together and why.
- [Hazard methodology](https://github.com/uExel/CryoHealth-geo/blob/main/docs/HAZARD_METHODOLOGY.md):
  how the hazard score and tier are computed (in CryoHealth-geo, the service that computes it).
- Related repositories: [cryohealth](https://github.com/uExel/cryohealth) (web dashboard),
  [cryohealth-app](https://github.com/uExel/cryohealth-app) (CHW mobile app),
  [CryoHealth-geo](https://github.com/uExel/CryoHealth-geo) (satellite and hazard pipeline).
