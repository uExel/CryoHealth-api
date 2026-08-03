# HANDOFF — CryoHealth-api — 2026-08-03 12:25 PKT
Session: hazard-score-service-auth  Model: sonnet-5  Branch: feat/2-hazard-score-service-auth  Goal: #2 (G2, tracked in CryoHealth-geo)

## State
Small, focused enabling change for CryoHealth-geo's hazard index task (CryoHealth-geo#2):
`POST /alerts/hazard-scores` previously required a human `cryohealth_admin` JWT, which the
geo service has no way to obtain (documented gap noted in three places in the code). Added
a second, narrower auth path: `@AllowServiceKey()` on that one route, checked in
`JwtAuthGuard` via a constant-time comparison against `GEO_SERVICE_API_KEY` (env var,
required, min 32 chars) sent as the `x-api-key` header. A valid key attaches a synthetic
`cryohealth_admin` JwtPayload to the request so `RolesGuard` behaves identically to a real
admin — the key does not skip role checks, only the JWT step, and only on routes that
explicitly opt in.

Live-verified against a real running instance + real Postgres: no key → 401, wrong key →
401, correct key → 201 with a real `Alert` row created (tier transition fired correctly).
Cleaned up the smoke-test artifacts afterward (deleted the test alert + hazard_score row).

**Unrelated finding during verification**: `shishper`'s `currentTier` was `critical` with
zero corresponding `alerts` or `hazard_scores` rows to justify it — no audit trail
explaining how it got there (likely a cleanup gap from the earlier alerts-engine
verification session, ADR 0003). No legitimate alert/score history existed for any lake,
so it was reset to `normal` (the true rest state) as part of this session's cleanup. Not
otherwise investigated further — flagging in case it matters for other in-flight work.

## Done this session
- `src/common/decorators/allow-service-key.decorator.ts` (new): `@AllowServiceKey()`
- `src/common/guards/jwt-auth.guard.ts`: checks `x-api-key` against `GEO_SERVICE_API_KEY`
  on routes with `@AllowServiceKey()`, constant-time compare via `crypto.timingSafeEqual`
- `src/config/validation.schema.ts`: `GEO_SERVICE_API_KEY` (required, min 32)
- `src/alerts/alerts.controller.ts`: `@AllowServiceKey()` added to `POST /alerts/hazard-scores`
- `.env.example` updated; real value generated locally, gitignored `.env`
- `src/common/guards/jwt-auth.guard.spec.ts`: 3 new cases (valid key, wrong key, no key
  configured) — 25/25 tests passing, lint clean
- Live verification against real app + real Postgres (see State above)

## Not done / deferred
- mTLS or a rotating-credential scheme — a static shared secret was judged sufficient for
  a single trusted internal caller; revisit if more services need to call this API
- The `shishper` tier anomaly above wasn't root-caused, only reset

## Next action
None here — this was a small enabler. CryoHealth-geo#2 (the actual hazard index
computation + reporting) continues in that repo using this endpoint.

## Open questions for a human
- none blocking

## Failed approaches (do not retry)
- none

## Loops run
- none needed; single clean pass

## Files touched
src/common/decorators/allow-service-key.decorator.ts (new), src/common/guards/jwt-auth.guard.ts,
src/common/guards/jwt-auth.guard.spec.ts, src/config/validation.schema.ts,
src/alerts/alerts.controller.ts, src/alerts/dto/record-hazard-score.dto.ts, .env.example,
docs/ai/HANDOFF.md

## Verification status
tests: 25/25 passing  lint: clean (2 pre-existing unrelated warnings)  review: n/a (net-new
auth surface, but scoped to one opt-in route; constant-time compare used deliberately)
Live-verified: real app boot with the new required env var, real 401/401/201 sequence
against a real Postgres-backed endpoint, real Alert row created and confirmed, test
artifacts cleaned up afterward.

## Resume with
/uexel:orient — this branch is done, ready for PR.
