# HANDOFF — CryoHealth-api — 2026-10-30
Session: issue-3-docker-compose-full-stack  Model: claude-sonnet-5-5  Branch: fix/3-docker-compose-full-stack  Goal: none  Task: CryoHealth-api#3 (first part: one-command stack)

## State
Not merged, not deployed. First part of #3 ("docker compose up runs the full stack one-command"). On `main`, `docker compose --profile full up` exits: the API stops at boot with `"GEO_SERVICE_API_KEY" is required. "FIREBASE_PROJECT_ID" is required. "FIREBASE_CLIENT_EMAIL" is required. "FIREBASE_PRIVATE_KEY" is required` (reproduced 2026-10-30 on main 529129d). Even with those, the API would look for the database on port 5433 (the host port) instead of 5432, and the database would be empty.

## Done this session
- `docker-compose.yml`: shared dev-only environment (`NODE_ENV=development` so Firebase is not required, `DB_PORT=5432`, `GEO_SERVICE_API_KEY` dev value of 32+ chars); new one-shot `migrate` service (migrations, `seed:lakes`, `seed:users`); `api` waits for it (`service_completed_successfully`).
- `README.md` rewritten (one-command run, test logins, public endpoints, settings, links to ARCHITECTURE.md and the hazard methodology in CryoHealth-geo). Checked by running its commands on a fresh clone.
- `scripts/seed-users.ts`: new reviewer login `reviewer-001` (role `viewer`).
- Tested with a separate project name and other host ports (nothing of the existing local containers was touched): db healthy, migrate exit 0 (6 lakes, 4 users), api up; `/health` ok, `/lakes` returns 6, login with a seeded user returns a token, `/admin/lakes` 200 with token and 401 without, wrong PIN 401, `/docs` 200, no errors in the API log. A second `up` on the same database is safe ("No migrations are pending", seeds only update).

## Not done / deferred
- #3 is not finished: the 3-minute demo video needs a person to record it. There is no hazard methodology doc in this repo (README links the one in CryoHealth-geo `docs/HAZARD_METHODOLOGY.md`).
- **Merge with or after CryoHealth-api#28.** On `main` today the lake write routes (`POST/PUT/DELETE /admin/lakes`) have no role check, so `reviewer-001` (viewer) can still create, edit and delete lakes (tested: POST gets past the role check with 400, DELETE returns 200). With #28 merged, every write by `reviewer-001` is 403 and `admin-001` still works (tested).
- With `NODE_ENV=development` push notifications are not sent in this demo stack (no Firebase credentials). Do not use this stack for a real deployment: its secrets are fixed, public, dev-only values.
- Not tested: a machine without Docker layer cache (first build downloads all packages).

## Next action
Review. Merge together with or after CryoHealth-api#28.
