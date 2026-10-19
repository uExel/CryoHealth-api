# HANDOFF — CryoHealth-api — 2026-10-18
Session: open-api-prs-handoff-consolidation  Model: claude-sonnet-5-5  Branch: (shared by PRs #21, #22, #23, #24, #25, #26)  Goal: none  Task: land the six open API PRs without `HANDOFF.md` conflicts

## State
`main` is at 529129d and already includes PR #27 (FCM push notifications). Six more API PRs are open against it. None is merged or deployed. This file is identical on all six branches on purpose, so they can be merged in any order without conflicting on it (see "Why this file looks the same on every branch").

| PR | Branch | What it does | Session note |
|---|---|---|---|
| #21 | `fix/19-protocol-steps` | Protocol step validation reads the tier list from one shared `TIERS` const instead of its own copy (#19); fixes a wrong comment in the dev seed | `sessions/2026-10-06-issue-19-protocol-steps-handoff.md` |
| #22 | `fix/issue-30-lake-alerts-include-status` | `GET /lakes/:id/detail` also returns alert `status` and `cleared_at` (API half of cryohealth#30) | `sessions/2026-10-07-issue-30-lake-alerts-status-handoff.md` |
| #23 | `fix/14-glacier-rgi-seed` | Glacier register seeded from RGI v7.0 and cited sources, with a migration (`source_url`, unique `rgi_id`), `seed:glaciers` / `verify:glaciers` scripts (#14) | `sessions/2026-10-07-issue-14-glacier-rgi-seed-handoff.md` |
| #24 | `fix/issue-34-delete-guards-lock` | Delete of a district or glacier locks the parent row before counting dependents; district delete refuses with 409 while rows still point at it (cryohealth#34) | `sessions/2026-10-12-issue-34-delete-guards-lock-handoff.md` |
| #25 | `feat/admin-create-case` | `POST /admin/cases` so the admin portal's "Log a case" form works (cryohealth#3) | `sessions/2026-10-12-issue-3-admin-create-case-handoff.md` |
| #26 | `fix/issue-13-lake-score-area-and-cors` | `CORS_ORIGINS` is read, `/lakes` returns the real latest score/area, no more fake `0` for risk score or downstream population (#13, partial) | `sessions/2026-10-14-issue-13-lake-score-and-cors-handoff.md` |

Each session's full handoff (what was done, how it was checked, what is left) is kept unedited in the file named in the table. The handoff of the push-notifications session that was on `main` before this one is `sessions/2026-10-16-push-notifications-handoff.md`.

## Done this session
- Merged `main` into all six branches and resolved the conflicts: `docs/ai/HANDOFF.md` on all six, and `package.json` on #23 (main added the `push:test` script, #23 added `seed:glaciers` and `verify:glaciers`; all three are kept, no dependency changed).
- Re-ran `tsc --noEmit` and `jest` on each branch after the merge: #21 55/55, #22 56/56, #23 97/97, #24 64/64, #25 62/62, #26 68/68 tests; `tsc` clean on all six.
- Found a second, non-docs collision: #22 and #26 both append a new test at the end of `src/lakes/lakes.service.spec.ts`. Moved #22's one test up the file (unchanged, only its position) so the two edit different places.
- Merging the six into `main` was tried in many orders (every ordered pair, plus a sample of full orders): no conflict. All six together pass `tsc` and 127 tests.
- Saved every session's handoff and the push-notifications handoff as separate files under `docs/ai/sessions/` so nothing was lost.

## Not done / deferred
- **Before deploying `main` (PR #27):** the server's `/opt/cryohealth/.env` needs `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`, and `docker-compose.prod.yml` (not in the repo) must load it with `env_file:`. Production refuses to boot without all three. This was marked blocking in the push session and is still unconfirmed.
- **#23 rollout:** after deploy, run `npm run migration:run`, then `npm run seed:glaciers && npm run verify:glaciers` in the API container.
- #26 does not close #13: downstream population needs a real source and per-score confidence does not exist yet.
- The cause of the conflicts is the CI check, not these branches (see Open questions).

## Next action
Review and merge #21 to #26 in any order. After the first one merges, GitHub should show the others as mergeable (an "Update branch" button may appear but is not needed for this file).

## Open questions for a human
- The `uexel-handoff-check` workflow fails any PR that does not change `docs/ai/HANDOFF.md`, so every parallel PR rewrites the same single-state file and they all conflict. Should the check also accept a new file under `docs/ai/sessions/` as proof of a handoff, and `HANDOFF.md` be refreshed on `main` only? The workflow is copied in by `bin/uexel-onboard` from uExel/cryo-harness, so the real fix belongs there. — blocking: no

## Why this file looks the same on every branch
Git only reports a conflict when two branches change the same lines in different ways. If both sides make the identical change, the merge is clean. So the six branches carry exactly this text, and each session's own handoff lives in its own, uniquely named file under `docs/ai/sessions/` (a new file with a new name can never conflict). When you add a session of your own, add a new file there; only touch this file when the branch you are on is the only one open.

## Failed approaches (do not retry)
- Resolving each PR's `HANDOFF.md` separately by keeping that PR's own text: it works for one merge, but after the first PR lands every other PR conflicts again.
- `npm run lint` runs with `--fix` and rewrites files; run `npx eslint <files>` on the files you changed instead.
- Git Bash turns `git show origin/main:path` into a Windows path list; set `MSYS_NO_PATHCONV=1` first.

## Loops run
- none

## Files touched
docs/ai/HANDOFF.md, docs/ai/sessions/2026-10-16-push-notifications-handoff.md, and one `docs/ai/sessions/*-handoff.md` per PR (named in the table above), plus `package.json` on #23 (script lines only). The only other non-doc change is #22's `src/lakes/lakes.service.spec.ts`, where a test moved position; no production code changed.

## Verification status
tests: #21 55/55, #22 56/56, #23 97/97, #24 64/64, #25 62/62, #26 68/68 (each with `main` merged in); all six combined 127  tsc: clean on all six and combined  lint: not run on this change (docs only)  review: none  qa: n/a — no production code changed

## Resume with
/uexel:orient   (then: gh pr list --repo uExel/CryoHealth-api --state open)
