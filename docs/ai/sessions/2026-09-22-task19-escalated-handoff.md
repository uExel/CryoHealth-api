# HANDOFF — CryoHealth-api — 2026-09-22 PKT

Session: task19-escalated Model: claude-sonnet-5 Branch: main Goal: none Task: #19 (companion to cryohealth-app#5) — **agent:needs-human**

## State

Issue #19 is **escalated, not pushed, fix-loop budget (3) exhausted.** Full detail:
[issue comment](https://github.com/uExel/CryoHealth-api/issues/19#issuecomment-5780982213).

The short version: this whole feature was built and fix-looped (twice) against two
dev-seeded protocols (`fast-breathing-pneumonia-2y`, `glof-evacuation-checklist`). The
third and final verify pass checked live production (`GET /protocols` on
`api.cryohealth.io` is public, no credentials needed) and found **production has 11
real clinical protocols — cholera, severe malaria, diarrhoea treatment — and neither
dev protocol exists there.** Confirmed independently by this session, not just taken on
the verifier's word (`curl https://api.cryohealth.io/protocols | jq`). All 11 real
protocols have `steps: null`. The backfill migration `263e516` is an
`UPDATE ... WHERE slug = ...` against slugs that don't exist in production — a complete
no-op there.

**This cannot be resolved by further engineering.** The real gap is that 11 real
protocols need real `steps` content, and that content is clinical dosing/diagnosis
text — composing it here would violate this workspace's hardest rule (PRD §9 R5: never
an LLM in the dosing/diagnosis path). Local `main` is 6 commits ahead of `origin/main`,
**not pushed, holding for a human product/content decision.**

## Done this session

See `docs/ai/sessions/2026-09-22-task19-build-handoff.md` for the full build + two-round
fix-loop history (steps/DTO validation, tests, the deploy-coupling migration fix). All of
that work is sound in isolation — verified as such — but points at data that doesn't
exist in production.

Additional findings from the third verify pass, real but not the blocking issue:

- The migration's `GLOF_STEP` factory drops the step-number suffix — all three GLOF
  steps would render as bare `"STEP"` (also a React key collision on the app side).
- The migration has no `steps IS NULL` guard or audit trail — unconditionally overwrites
  `steps`/`source`, so a future `migration:run` in an environment where these rows
  already exist (with human-curated content) would silently revert it with no audit row.

## Not done / deferred

- Real `steps` content for the 11 actual production protocols — needs a
  clinician/PM/human author, not an engineering fix
- The `GLOF_STEP` label-suffix bug and missing `steps IS NULL` guard — worth fixing
  whenever this work resumes, but secondary to the content gap
- `Facility.vulnerability` still has no entity mapping (long-standing, unrelated)

## Next action

Human decides (posted as the actual question on cryohealth-app#5):

1. Is real `steps` content for the 11 production protocols coming from a
   clinician/PM on a timeline — in which case this feature is fine to ship as-is once
   that content lands (Guidance is designed to show "not available yet" until then,
   which is the correct behavior, not a bug)?
2. Or should the complaint-map/rollout scope be reduced until real content exists, so
   nothing ships looking more complete than it is?

Either way, if this resumes: fix the `GLOF_STEP` label bug and add the `steps IS NULL`
guard, and change the migration's dev-protocol slugs to whatever the real decision
requires (a proper upsert against the 11 real slugs, most likely, not the two dev ones).

## Open questions for a human

- The product/content decision above — blocking: yes, for anything further here
- Push local commits (schema migration only, the additive `steps` column) independent
  of the data question? — not decided; the schema change itself is harmless whether or
  not real content exists yet, but wasn't separated out this session

## Failed approaches (do not retry)

- `migration:generate` against the current dev DB — picks up unrelated pre-existing
  schema drift; always hand-write a minimal migration for a single additive column
- **Encoding a data backfill as a migration keyed to dev-only slugs and assuming it
  covers "production data"** — always check what's actually in production first
  (`curl` the public endpoint) before assuming dev-seeded content matches. This was the
  root cause of the entire escalation: three rounds of fixing correct-in-isolation code
  before checking the one fact that mattered.
- GitHub Actions "Re-run failed jobs" without confirming the modal — does nothing
  silently; always screenshot to confirm

## Loops run

- Fix loop for #19/cryohealth-app#5's `/uexel:verify` findings: **iteration 1** (3
  findings fixed — safety fallback, validation, tests — second verify passed).
  **Iteration 2** (deploy-coupling migration fix — third verify found it targets
  nonexistent production data). **Budget exhausted at 3 — escalated, not resolved.**
  This is a correct outcome per loop-contract.md, not a failure to hide: the loop found
  real, fixable code issues at every iteration, but iteration 3 surfaced that the
  premise (which protocols matter) was wrong, which no amount of code fixing resolves.

## Files touched

This session (escalation): docs/ai/HANDOFF.md,
docs/ai/sessions/2026-09-22-task19-build-handoff.md (new, archived). No source changed
this pass — see the archived file for the full build/fix-loop file list.

## Verification status

Code: sound in isolation (39/39 tests, clean build, migration up/down verified correct).
**Data: wrong target** — confirmed via live production `curl`, not a code defect.
Not pushed.

## Resume with

/uexel:orient (then: read the human decision on cryohealth-app#5, don't resume the
fix loop — it's exhausted and the remaining gap isn't a loop-shaped problem)
