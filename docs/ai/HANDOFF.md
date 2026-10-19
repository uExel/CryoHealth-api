# HANDOFF — CryoHealth-api — 2026-10-18
Session: open-api-prs-handoff-consolidation  Model: claude-sonnet-5-5  Branch: (shared by PRs #22, #24, #25, #26)  Goal: none  Task: land the four open API PRs without `HANDOFF.md` conflicts

## State
`main` is at 529129d and already includes PR #27 (FCM push notifications). Four more API PRs are open against it. None is merged or deployed. This file is identical on all four branches on purpose, so they can be merged in any order without conflicting on it (see "Why this file looks the same on every branch").

| PR | Branch | What it does | Session note |
|---|---|---|---|
| #22 | `fix/issue-30-lake-alerts-include-status` | `GET /lakes/:id/detail` also returns alert `status` and `cleared_at` (API half of cryohealth#30) | `sessions/2026-10-07-issue-30-lake-alerts-status-handoff.md` |
| #24 | `fix/issue-34-delete-guards-lock` | Delete of a district or glacier locks the parent row before counting dependents; district delete refuses with 409 while rows still point at it (cryohealth#34) | `sessions/2026-10-12-issue-34-delete-guards-lock-handoff.md` |
| #25 | `feat/admin-create-case` | `POST /admin/cases` so the admin portal's "Log a case" form works (cryohealth#3) | `sessions/2026-10-12-issue-3-admin-create-case-handoff.md` |
| #26 | `fix/issue-13-lake-score-area-and-cors` | `CORS_ORIGINS` is read, `/lakes` returns the real latest score/area, no more fake `0` for risk score or downstream population (#13, partial) | `sessions/2026-10-14-issue-13-lake-score-and-cors-handoff.md` |

Two more PRs are open from another author and are not covered here: #21 (protocol step validation) and #23 (glacier RGI seed). Both also rewrite `HANDOFF.md`, and #23 also conflicts in `package.json`.

Each session's full handoff (what was done, how it was checked, what is left) is kept unedited in the file named in the table. The handoff of the push-notifications session that was on `main` before this one is `sessions/2026-10-16-push-notifications-handoff.md`.

## Done this session
- Merged `main` into #22, #24, #25 and #26 and resolved the only conflict, `docs/ai/HANDOFF.md`. No code conflicted.
- Re-ran `tsc --noEmit` and `jest` on each branch after the merge: #22 56/56, #24 64/64, #25 62/62, #26 68/68 tests; `tsc` clean on all four.
- Saved every session's handoff and the push-notifications handoff as separate files under `docs/ai/sessions/` so nothing was lost.

## Not done / deferred
- **Before deploying `main` (PR #27):** the server's `/opt/cryohealth/.env` needs `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`, and `docker-compose.prod.yml` (not in the repo) must load it with `env_file:`. Production refuses to boot without all three. This was marked blocking in the push session and is still unconfirmed.
- Migrations were only exercised by mocked tests locally on #26 (`...DropInventedRiskScoreConfidence`, `...MakeLakeDownstreamPopulationNullable`). CI runs `npm run migration:run` against Postgres on every PR, which covers them; still check `/lakes` and `/hot-lakes` on a dev database.
- #26 does not close #13: downstream population needs a real source and per-score confidence does not exist yet.
- PRs #21 and #23 are not updated; each needs `main` merged in and its own `HANDOFF.md` resolved (see below).
- The cause of the conflicts is the CI check, not these branches (see Open questions).

## Next action
Review and merge #22, #24, #25 and #26 in any order. After the first one merges, GitHub should show the others as mergeable (a "Update branch" button may appear but is not needed for this file).

## Open questions for a human
- The `uexel-handoff-check` workflow fails any PR that does not change `docs/ai/HANDOFF.md`, so every parallel PR rewrites the same single-state file and they all conflict. Should the check also accept a new file under `docs/ai/sessions/` as proof of a handoff, and `HANDOFF.md` be refreshed on `main` only? The workflow is copied in by `bin/uexel-onboard` from uExel/cryo-harness, so the real fix belongs there. — blocking: no

## Why this file looks the same on every branch
Git only reports a conflict when two branches change the same lines in different ways. If both sides make the identical change, the merge is clean. So the four branches carry exactly this text, and each session's own handoff lives in its own, uniquely named file under `docs/ai/sessions/` (a new file with a new name can never conflict). When you add a session of your own, add a new file there; only touch this file when the branch you are on is the only one open.

## Failed approaches (do not retry)
- Resolving each PR's `HANDOFF.md` separately by keeping that PR's own text: it works for one merge, but after the first PR lands every other PR conflicts again.
- `npm run lint` runs with `--fix` and rewrites files; run `npx eslint <files>` on the files you changed instead.
- Git Bash turns `git show origin/main:path` into a Windows path list; set `MSYS_NO_PATHCONV=1` first.

## Loops run
- none

## Files touched
docs/ai/HANDOFF.md, docs/ai/sessions/2026-10-16-push-notifications-handoff.md, and one `docs/ai/sessions/*-handoff.md` per PR (named in the table above). No source files changed in this session.

## Verification status
tests: #22 56/56, #24 64/64, #25 62/62, #26 68/68 (each with `main` merged in)  tsc: clean on all four  lint: not run on this change (docs only)  review: none  qa: n/a — no code changed

## Resume with
/uexel:orient   (then: gh pr list --repo uExel/CryoHealth-api --state open)
