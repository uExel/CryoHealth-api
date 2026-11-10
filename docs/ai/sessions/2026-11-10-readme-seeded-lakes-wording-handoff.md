# Handoff: README lake count wording (2026-11-10)

Branch: docs/readme-seeded-lakes-wording (stacked on fix/3-docker-compose-full-stack, PR #30). Model: claude-sonnet-5-5.

## What and why
PR #30's README said "the 6 real, cited lakes" (lines 27 and 45). PR #34 raises the seed to 31 lakes, so the text would be stale after both merge, and wrong in a different way if only one does. Both lines now say "the seeded lakes" without a number. No code changed.

## Not done
- #34's own count lives in scripts/verify-lakes.ts (the 25-lake target); the README points there.

## Next action
Merge #30 first; this PR then retargets to main and carries only the README and handoff lines.
