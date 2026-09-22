# HANDOFF — CryoHealth-api — 2026-09-22 PKT
Session: task19-build  Model: claude-sonnet-5  Branch: main  Goal: none  Task: #19 (companion to cryohealth-app#5)

## State
Issue #19 (nullable `steps` jsonb on `Protocol`, for cryohealth-app's Guidance screen) is
**built and fix-looped, GATE-approved, not yet independently re-verified as of this
commit** — `/uexel:verify` iteration 2 is running in the background as this file is
written; its verdict lands as a comment on #19 and cryohealth-app#5. **Do not push to
`origin/main` until that verdict is a clean pass** — pushing here triggers CI then an
automatic production deploy (migration + seed run against live Postgres, container
restart on `api.cryohealth.io`). Local `main` is 4 commits ahead of `origin/main`
(`b197c55`, `1094ea2`, `2d62417`, `e79866c`), none pushed.

## Done this session
- `b197c55`: nullable `steps` jsonb column on `Protocol` + initial DTO validation.
  Migration hand-written after discarding an unsafe `migration:generate` auto-diff that
  picked up ~15 unrelated columns/constraints of pre-existing schema drift.
- `1094ea2`: seeded real `steps` content (4 CHW / 3 public steps) for the pneumonia
  protocol, transcribed verbatim from cryohealth-app's `mock.ts`.
- **First `/uexel:verify` pass found 3 findings** (posted on cryohealth-app#5): (1) public
  mode could see CHW dosing content via a body-fallback that ignored audience, (2)
  malformed `steps` payloads were accepted by the API and crashed the app, (3) no test
  covered the new validation. Fix loop, iteration 1:
  - `2d62417`: `@IsDefined`/`@IsArray`/`@ArrayMinSize(1)` on `steps.chw`/`.pub`,
    `@IsObject()` on `steps` itself (closes finding 2 at the API boundary). New
    `protocol-steps.dto.spec.ts`, 11 cases covering the verifier's exact payload matrix
    (closes finding 3).
  - `e79866c`: populated `steps` for `glof-evacuation-checklist` too (was the one row
    still relying on the unsafe fallback — closes finding 1 at the data layer; identical
    chw/pub content since evacuation instructions aren't audience-restricted the way
    dosing is). Curated both protocols' `source` field to drop an internal file-path leak
    the verifier flagged.
- Second `/uexel:verify` launched to confirm the fix loop — **result not in yet**.

## Not done / deferred
- Waiting on the re-verify verdict before this can be considered closed or pushed
- `Facility.vulnerability` still has no entity mapping (long-standing, unrelated)
- No CI step boots the built container/image (long-standing, unrelated)

## Next action
Read the re-verify verdict when it lands. If pass (or findings acknowledged): push to
`origin/main` (triggers the production deploy) only with explicit human confirmation —
that gate was set explicitly this session, not assumed. If findings remain: continue the
fix loop (iteration 2 of 3 max).

## Open questions for a human
- Push to `origin/main` once verify passes? — blocking: yes, for the production deploy
  specifically (explicit confirmation required regardless of verify outcome)

## Failed approaches (do not retry)
- `migration:generate` against the current dev DB — picks up unrelated pre-existing
  schema drift (~15 columns/constraints across `lakes`/`districts`/`glaciers`/
  `chw_profiles`); always hand-write a minimal migration for a single additive column
- GitHub Actions "Re-run failed jobs" without confirming the modal — does nothing
  silently; always screenshot to confirm
- Making GHCR packages public instead of using a PAT — blocked by uExel org policy

## Loops run
- Fix loop for #19/cryohealth-app#5's `/uexel:verify` findings: iteration 1 of 3 max,
  fixed all 3 findings, re-verify in progress. Verifier: uexel-verifier agent. Rubrics:
  code-review.md, api-design.md.

## Files touched
`src/protocols/entities/protocol.entity.ts`, `src/protocols/dto/*.ts` (new:
`protocol-steps.dto.ts`, `protocol-steps.dto.spec.ts`), `src/protocols/protocols.service.ts`,
`src/database/migrations/1790093553705-AddProtocolSteps.ts` (new),
`scripts/seed-dev-data.ts`, docs/ai/HANDOFF.md.

## Verification status
tests: 39/39 passing (28 pre-existing + 11 new). build: clean. Live checks: migration
applied, both seeded protocols now have populated `steps`, malformed-payload rejection
confirmed via direct DTO validation tests. Independent re-verify (iteration 2): pending.

## Resume with
/uexel:orient   (then: check the re-verify verdict on issue #19 / cryohealth-app#5)
