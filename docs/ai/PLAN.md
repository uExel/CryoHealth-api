# PLAN — CryoHealth-api#5: lake inventory seed
Goal: #1 (G1 milestone) · Task: #5 · Loop budget: 3 · Rollback: revert PR; migration is reversible

Scope changed from the task's literal DoD after research (documented in ADR 0002):
seeded 6 individually-verified lakes with mandatory source citations instead of a
fabricated 25. Decision made with Shaan before writing code (AskUserQuestion,
"Verified subset now, rest flagged").

Steps:
1. Lake entity: add slug (idempotency key), source (required), sourceUrl — migration
   generated + applied — verify: npm run migration:run
2. Seed data (6 lakes, cited) + idempotent seed script + integrity-focused verify
   script + npm scripts — verify: npm run seed:lakes && npm run verify:lakes
3. Live boot proof: GET /lakes serves the real seeded data with citations — verify:
   manual curl against running app (done, not scripted — matches prior task's pattern)

GATE: skipped for the initial plan (Shaan said "start task 5" directly); the scope
change itself went through an explicit AskUserQuestion checkpoint before any code was
written, which is the actual gate this task needed.
