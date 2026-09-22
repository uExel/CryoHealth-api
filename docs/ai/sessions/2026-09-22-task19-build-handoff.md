# HANDOFF — CryoHealth-api — 2026-09-22 PKT
Session: task19-build  Model: claude-sonnet-5  Branch: main  Goal: none  Task: #19 (companion to cryohealth-app#5)

## State
Issue #19 is **built, fix-looped twice, second verify passed both rubrics — third and
final verify (loop budget is 3 max) running now** on the two newest commits, which fix a
real deploy-coupling gap the second verify surfaced (see below). **Do not push to
`origin/main` until that verdict lands** — pushing here triggers CI then an automatic
production deploy (migration run against live Postgres, container restart on
`api.cryohealth.io`), and a human confirms that push separately even after a pass, per
this session's explicit gate. Local `main` is 6 commits ahead of `origin/main`
(`b197c55`, `1094ea2`, `2d62417`, `e79866c`, `07b3af4` docs, `263e516`), none pushed.

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
- **Second `/uexel:verify` passed both rubrics**, but its report opened with a "READ
  FIRST" section catching something more important than a code defect: `.github/
  workflows/deploy.yml` only runs `scripts/seed-glaciers.ts` on deploy —
  `seed-dev-data.ts` is dev-only by design (its own header says so) and never runs in
  production. So `1094ea2`/`e79866c`'s data fix (populated `steps`, cleaned `source`)
  would never have reached production through a normal push, even though
  `migration:run` does run there (via the server's `deploy.sh`). Concrete risk: shipping
  cryohealth-app's fix (public mode refuses to render `body` when `steps` is null)
  against a production DB where `glof-evacuation-checklist.steps` was still null would
  have hidden real evacuation instructions from the public during a live GLOF alert.
  - `263e516`: fixed by encoding the same data fix as an idempotent `UPDATE` migration
    (`1790097238238-BackfillProtocolSteps.ts`) instead of relying on the seed script —
    migrations run on deploy, seeds don't. Verified locally both directions: reset both
    rows to pre-fix state, ran `up()` (correct), ran `down()` (exact prior `source`
    strings restored, not a guess), ran `up()` again to leave the dev DB correct.
- Third `/uexel:verify` (final iteration, loop budget 3 max) launched on `e79866c..263e516`
  — **result not in yet**.

## Not done / deferred
- Waiting on the third verify's verdict before this can be considered closed or pushed
- `Facility.vulnerability` still has no entity mapping (long-standing, unrelated)
- No CI step boots the built container/image (long-standing, unrelated)

## Next action
Read the third verify's verdict when it lands. If pass (or findings acknowledged): push
to `origin/main` (triggers the production deploy) only with explicit human confirmation —
that gate was set explicitly this session, not assumed. If findings remain: the fix-loop
budget (3) is exhausted — per loop-contract.md, that's an escalation (`agent:needs-human`
on the issue), not another silent iteration.

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
- Fix loop for #19/cryohealth-app#5's `/uexel:verify` findings: iteration 1 (3 findings
  fixed, second verify passed with a critical non-blocking observation), iteration 2
  (deploy-coupling gap fixed via migration, third/final verify in progress). Budget 3
  max, this is the last one. Verifier: uexel-verifier agent. Rubrics: code-review.md,
  api-design.md.

## Files touched
`src/protocols/entities/protocol.entity.ts`, `src/protocols/dto/*.ts` (new:
`protocol-steps.dto.ts`, `protocol-steps.dto.spec.ts`), `src/protocols/protocols.service.ts`,
`src/database/migrations/1790093553705-AddProtocolSteps.ts` (new),
`src/database/migrations/1790097238238-BackfillProtocolSteps.ts` (new),
`scripts/seed-dev-data.ts`, docs/ai/HANDOFF.md.

## Verification status
tests: 39/39 passing (28 pre-existing + 11 new). build: clean. Live checks: both
migrations applied and reverted/re-applied to confirm correctness, both seeded protocols
have populated `steps`, malformed-payload rejection confirmed via direct DTO validation
tests. Third/final independent verify: pending.

## Resume with
/uexel:orient   (then: check the final verify verdict on issue #19 / cryohealth-app#5)
