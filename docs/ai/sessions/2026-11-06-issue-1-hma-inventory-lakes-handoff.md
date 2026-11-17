# HANDOFF — CryoHealth-api — 2026-11-06
Session: issue-1-hma-inventory-lakes  Model: claude-sonnet-5-5  Branch: feat/1-hma-inventory-lakes  Goal: none  Task: #1 criterion 3 (>=25 real lakes) — review, verify and PR the inventory-derived lakes that were sitting uncommitted in a local worktree

## State
The work (ADR 0004, `scripts/data/extract_hma_lakes.py`, `hma-inventory.seed-data.ts`, seed/verify changes, a data spec) was written in another local worktree (`CryoHealth-api-issue1`, branch `feat/1-open-inventory-lakes`, never committed or pushed). This branch is a verbatim copy of those files on top of `origin/main`, plus the handoff files. The original worktree was only read, not changed. Not merged.

## Done this session
- Reviewed the selection method, the generator, the seed/verify SQL and the spec. Method is deterministic and documented; nothing is invented. Lakes are unnamed (`Unnamed glacial lake GL_<lat>_<lon>`), `damType` unknown, `historicalGlof` false.
- Independent check against a different dataset (HKH-PK-2020, Zenodo 10.5281/zenodo.15476013, PlanetScope Sept 2020, manual outlines; its CRS label is wrong, it is UTM 43N): **23 of the 25 lakes lie within 100 m of an outline there, area ratio 0.86 to 1.14 (median 0.98).** The other 2 (both Ghanche, 77.14 E and 77.57 E) have no outline within 14 km / 35 km: HKH-PK-2020 does not cover that area, so they could not be verified this way.
- Seed SQL checked against the migrations: `districts(name unique, province)`, `lakes.district_id`, `lakes.area_km2`, `lakes."elevationM"` all exist; parameter order matches; 11 districts, at most 4 per district.
- Checks: `tsc` clean, `jest` 61/61 (55 on main + 6 new), prettier clean on the new TS.

## Not done / deferred
- Not run on this machine's Postgres (Docker Desktop was off, 0.9 GB free RAM; local Postgres use was refused by the permission classifier). Run instead on a throwaway GitHub Actions PostGIS service (temporary branch, deleted): see Verification status. `ci.yml` itself still runs only `migration:run` and unit tests, not `seed:lakes`/`verify:lakes`.
- The 2 far-east Ghanche lakes (77.14 E and 77.57 E, near the Siachen/Saltoro glaciers) are not verified by the cross-check above. A person should confirm they belong in a Pakistan early-warning inventory and that anyone lives downstream.
- The 25 rows are not the named GLOF-II shortlist (CryoHealth-geo#1/#4 still open). No Hunza or Nagar lakes were selected (21 and 2 lakes in the inventory); the six named Hunza/Ghizer lakes stay hand-cited.
- `README.md` on PR #30 says "the 6 real, cited lakes" (lines 27 and 45); it will be stale once both merge.
- `scripts/verify-lakes.ts` has prettier errors (some already on `main`); `scripts/` is not linted by CI.

## Next action
Human review, then merge. Before the production deploy, check that `deploy.sh` runs `migration:run` (this PR needs none of its own, but `seed:lakes` is not part of the deploy workflow, so run `npm run seed:lakes && npm run verify:lakes` in the API container after deploying).

## Open questions for a human
- Should 25 "Unnamed glacial lake" rows appear on the public Open Data API (`/lakes`) and the dashboard map? CryoHealth-geo will also start scoring them. — blocking: no
- Keep the two far-east Ghanche lakes? — blocking: no

## Failed approaches (do not retry)
- Reading HKH-PK-2020 as EPSG:4326: it is UTM 43N.
- Linting with `npm run lint`: it runs `--fix` and rewrites files; use `npx eslint <files>`.

## Loops run
- none

## Files touched
CLAUDE.md, docs/ai/decisions/0002-lake-data-provenance.md, docs/ai/decisions/0004-hma-inventory-lakes.md, scripts/seed-lakes.ts, scripts/verify-lakes.ts, scripts/data/extract_hma_lakes.py, src/lakes/data/hma-inventory.seed-data.ts, src/lakes/data/seed-data.spec.ts, docs/ai/HANDOFF.md (shared text), this file

## Verification status
tests: 61/61  tsc: clean  lint: new TS clean (prettier); scripts/verify-lakes.ts has prettier errors, not linted by CI  review: self-review only  qa: independent cross-check 23/25 within 100 m; real PostGIS 16 (GitHub Actions service, fresh DB): `migration:run` ok, `seed:lakes` 31 inserted, `verify:lakes` OK, `seed:lakes` again 0 inserted / 31 updated, `verify:lakes` OK; 31 lakes, 31 linked to a district, 25 with area and elevation, 12 districts, 0 invalid geometries. `test:e2e` not run.

## Resume with
/uexel:orient   (then: gh pr list --repo uExel/CryoHealth-api --state open)
