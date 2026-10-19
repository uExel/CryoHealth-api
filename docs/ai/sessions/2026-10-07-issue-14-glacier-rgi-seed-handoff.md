# HANDOFF — CryoHealth-api — 2026-10-07 13:00 PKT
Session: issue-14-glacier-rgi-seed  Model: claude-opus-5-5  Branch: fix/14-glacier-rgi-seed  Goal: cryohealth#1  Task: #14

## State
The glacier register is now seeded from cited data. It has 32 glaciers:
- 24 are matched to RGI v7.0. Their area, length, elevation, centroid and outline date are read from a committed extract (`src/glaciers/data/rgi7-region14-extract.csv`).
- 6 are tributaries with no RGI outline of their own. They carry only published values: USGS PP 1386-F Table 3, Young & Schmok 1989 (Miar), and Wake & Searle 1993 (Pumarikish).
- 2 are names only, with no published measurement: Ghandershish and Ghompot.

Each matched glacier gets one dated baseline observation, and so does each tributary that has a published value. Districts come from the geoBoundaries PAK ADM2 district that contains the RGI terminus point. Siachen and Bilafond are blank on purpose because the area is disputed.

The migration adds a `glaciers.source_url` column and a partial unique index on `rgi_id`. A duplicate RGI ID on admin create or edit returns 409. PR is open for #14. Nothing has been run in prod yet.

## Done this session
- Rewrote `scripts/seed-glaciers.ts` to use the data module (`src/glaciers/data/glaciers.seed-data.ts`) and upsert on `rgi_id`. It updates legacy rows in place, by name or renamed name.
- Added `scripts/verify-glaciers.ts`. It fails on:
  - a missing citation;
  - a point outside the region;
  - a zero or negative measurement;
  - an unregistered NULL `rgi_id`;
  - an unmatched record whose values differ from its citation.
- Matched 5 glaciers to unnamed RGI outlines by location. The evidence is in each record's notes:
  - Chogo Lungma
  - Shani
  - Mashish
  - Mazeno
  - Badswat (G1), renamed from "Badswat Glacier (G1/G2)"
- Added Passu and Ghulkin, both matched by RGI name.
- Set Shishper (RGI "Hasanabad Glacier II", a team identification) to status `surging`, the project's status term. The old value `surge-type` was not in the DTO or dashboard enums.
- `seed-dev-data.ts` no longer inserts glaciers. Its differently-named copies had created duplicate rows with no measurements.
- Added `seed:glaciers` and `verify:glaciers` npm scripts.
- Added `src/glaciers/data/glaciers.seed-data.spec.ts`, which checks the data module with no DB.

## Not done / deferred
- Vague team references need exact citations: the IUCN Karakoram source (Trango), the CKNP inventory (Chogo Lungma), PMD (Shani) and GAMDAM (Badswat). They are recorded as "as cited by the CryoHealth team".
- Districts: prod has 10 Gilgit-Baltistan districts, entered by hand through the admin UI. No seed creates them, so a fresh DB has only Hunza and Ghizer. In that case the glacier seed leaves the other districts NULL and prints a warning. Seeding them needs a source for the population figures.
- Glacier lat/lng stays the RGI centroid, by user decision; the terminus was considered and rejected. The dashboard ranks glaciers against lakes by distance from this point.
- Conflict with PR #21: both PRs rewrite `docs/ai/HANDOFF.md`, so whichever merges second needs a trivial conflict resolution. The archived `sessions/2026-09-27-alert-broadcast-fix-handoff.md` is byte-identical in both branches.
- Prod rollout: run `npm run migration:run`, then `npm run seed:glaciers && npm run verify:glaciers` in the API container. This updates prod's 30 existing glacier rows in place and adds Passu and Ghulkin.

## Next action
gh pr view --repo uExel/CryoHealth-api fix/14-glacier-rgi-seed

## Open questions for a human
- Exact references for the four vague citations above. — blocking: no
- Source for the prod district populations, so the 10 districts can be seeded. — blocking: no

## Failed approaches (do not retry)
- The NSIDC RGI v7 / v6 downloads need an Earthdata login. Use the public GLIMS GeoServer WFS (`GLIMS:RGI2000-v7.0-G-14_south_asia_west_epsg3857`) instead.
- `manager.query('UPDATE … RETURNING')` returns `[rows, rowCount]` in TypeORM's postgres driver, not just the rows. Destructure it, or a missing row is never inserted.
- Passing a bare `YYYY-MM-DD` to a timestamptz column stores local midnight (the DB session runs in Asia/Karachi). Append `T00:00:00Z`.
- `CREATE DATABASE` for a scratch test DB: the `cryohealth` role has no CREATEDB permission. Back up with `pg_dump` and test against the dev DB instead.

## Loops run
- none

## Files touched
package.json, scripts/seed-glaciers.ts, scripts/verify-glaciers.ts (new), scripts/seed-dev-data.ts, src/database/migrations/1791283685914-GlacierRgiUniqueAndSourceUrl.ts (new), src/glaciers/data/ (new: glaciers.seed-data.ts, glaciers.seed-data.spec.ts, rgi7-region14-extract.csv, README.md), src/glaciers/entities/glacier.entity.ts, src/glaciers/dto/create-glacier.dto.ts, src/glaciers/dto/update-glacier.dto.ts, src/glaciers/glaciers.service.ts, docs/ai/HANDOFF.md, docs/ai/sessions/2026-09-27-alert-broadcast-fix-handoff.md

## Verification status
tests: 87/87  tsc: clean  lint (glacier files): clean  review: none  qa: local dev DB. The migration ran; the seed was idempotent across repeated runs and inserted a missing row exactly once; `verify:glaciers` passed; `GET /glaciers` and `/glaciers/:id/observations` were checked, and `/admin/glaciers` was viewed in the dashboard.

## Resume with
/uexel:orient   (then: gh pr view --repo uExel/CryoHealth-api fix/14-glacier-rgi-seed)
