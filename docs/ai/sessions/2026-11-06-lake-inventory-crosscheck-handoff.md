# HANDOFF — CryoHealth-api — 2026-11-06
Session: lake-inventory-crosscheck  Model: claude-sonnet-5-5  Branch: docs/1-lake-inventory-crosscheck  Goal: none  Task: #1 criterion 3 (>=25 real lakes) — check what open data can do; merge-safety review of the open PR queue

## State
PR adds ADR 0004 and a read-only cross-check tool. **No lake row, schema, or runtime code changed.** Criterion 3 of #1 is still open and this PR does not close it (`Refs #1`). Nothing was merged or pushed to `main`.

## Done this session
- Found an openly downloadable lake-outline dataset: HKH-PK-2020 (Zenodo 15476013, CC BY 4.0, 8,808 outlines, Pakistan HKH, Sept 2020). Downloaded, checksum matches the record.
- **The record's CRS label is wrong**: page says EPSG:4326, the files are WGS 84 / UTM 43N in metres. Reproject before any use.
- The dataset has no names, valley, dam type or GLIMS/ICIMOD id (fields: OBJECTID_1, Id, OBJECTID, Shape_Leng, Shape_Le_1, Shape_Area), so it cannot give the shortlist.
- Cross-checked the six seeded lakes: none of the six points is inside an outline; nearest outline centroid is 1.85 to 9.71 km away. Inconclusive, not a refutation (single date, ephemeral ice-dammed lakes, glacier-level coordinates). Table and reasoning in ADR 0004. Seeds were left unchanged on purpose.
- Merge-safety review of the whole open queue (#21-#26, #28-#32 plus this PR); findings below.

## Merge-safety findings for the queue
Method: pairwise `git merge-tree` on all 66 pairs, then all 11 PRs merged one by one into a scratch branch (numeric order), `npm ci`, `tsc`, full `jest`, `eslint` (no `--fix`).
- **Result after resolving the two conflicts below: tsc clean, 18 suites, 157/157 tests, eslint 0 errors (126 existing warnings), `npm ci` ok.**
- **`HANDOFF.md` conflict:** #21-#26, #28, #30 and this PR carry the identical shared text. **#29, #31 and #32 each carry a different one**, so #31 and #32 conflict with every other PR on that file, and #29 with #31/#32. Fix: have #31 and #32 use the shared text (their own handoff goes in `docs/ai/sessions/`).
- **Real code conflict:** #32 conflicts with #26 and with #29 in `src/lakes/lakes.service.spec.ts` (both append tests at the end of the file). Resolved in the scratch merge by closing #29's last `describe` and then keeping #32's two `it` blocks; the result compiles and passes.
- Merge order: #29 is stacked on #26, so #26 first.
- Migrations: #26/#29 (`1790100000000`, `1790100000001`) and #23 (`1791283685914`) are older than main's newest (`1792000000000`). TypeORM 0.3.31 still runs them (its "timestamp too old" check is commented out in `MigrationExecutor.js`). No duplicate timestamps or class names.
- **Merging to `main` deploys to production automatically** (`deploy.yml`: after `ci` succeeds on `main`, it builds the image, runs `/opt/cryohealth/deploy.sh api`, then `seed-glaciers.ts` in the prod container).
- **#31 makes `SMTP_HOST` and `SMTP_FROM` required when `NODE_ENV=production`.** If `/opt/cryohealth/.env` lacks them, the API refuses to boot. Same class of problem as the `FIREBASE_*` variables from #27 (still unconfirmed).
- **#23:** the auto-run `seed-glaciers.ts` needs the new `source_url` column and unique `rgi_id` from that PR's migration. Whether `deploy.sh` runs migrations first is unknown (the script is not in this repo). If it does not, the post-deploy seed step fails.
- **#28 and #30:** merge #28 first or together; without it `reviewer-001` can still create/edit/delete lakes. `cryohealth` dashboard still shows the lake buttons to `facility_admin` (403 on click).

## Not done / deferred
- **Not run: seed and verify against a real Postgres.** Docker Desktop was not running and the machine had 0.9 GB free RAM, so it was not started; using the local PostgreSQL 18 on 5432 (reading `.env` credentials) was refused by the permission classifier, and I did not try another way around it. This PR does not touch the seed or verify code, so it would test `main`, not this change. Earlier evidence: the 2026-10-27 session and PR #30 ran migrations + `seed:lakes` + `verify:lakes` against Docker Postgres (6 lakes). `npm run test:e2e` was not run for the same reason.
- 25 real lakes: needs a person to choose outlines for the named shortlist, or the gated Zhang 2022 / ICIMOD / GLOF-II files (CryoHealth-geo#4). See ADR 0004.
- Not checked: `cryohealth` and `cryohealth-app` repos; the content of `deploy.sh`; the production `.env`.

## Next action
A human decides how to get the 25 lakes (ADR 0004, "Decision"). Before merging the queue: settle the `HANDOFF.md` text on #31/#32, resolve the spec conflict for #32, and confirm production has `SMTP_HOST`, `SMTP_FROM` and the `FIREBASE_*` variables.

## Open questions for a human
- Does `/opt/cryohealth/deploy.sh` run `migration:run` before the post-deploy glacier seed? — blocking: yes for #23
- Are `SMTP_HOST`/`SMTP_FROM` and `FIREBASE_*` set in production? — blocking: yes for #31 (and for #27 if not already confirmed)
- Who picks the outlines for the 25-lake shortlist? — blocking: no

## Failed approaches (do not retry)
- Reading the Zenodo shapefile as EPSG:4326: every lake lands in the wrong place; it is UTM 43N.
- Running the integration tests with `node_modules` junctioned from another branch's checkout: `nodemailer` (added by #31) was missing and one suite failed. Use a real `npm ci` in the merged tree.
- `git merge` in a loop after a conflict: later merges fail with "merge not concluded". Resolve and commit before the next one.

## Loops run
- none

## Files touched
docs/ai/HANDOFF.md (shared text), docs/ai/decisions/0004-open-lake-outline-crosscheck.md, docs/ai/sessions/2026-11-06-lake-inventory-crosscheck-handoff.md, scripts/lake-crosscheck/crosscheck_seeds.py, scripts/lake-crosscheck/shp_lib.py

## Verification status
tests: this branch changes no TypeScript (main baseline 55/55); queue merged together 157/157, 18 suites  tsc: clean on main baseline and on the merged queue  lint: 0 errors on the merged queue  review: none  qa: cross-check tool run against the real dataset (output reproduced twice); no database run (see above)

## Resume with
/uexel:orient   (then: gh pr list --repo uExel/CryoHealth-api --state open)
