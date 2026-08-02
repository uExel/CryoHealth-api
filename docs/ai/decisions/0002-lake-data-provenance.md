# ADR 0002 — Lake data provenance: verified subset now, not fabricated 25

## Context
Task #5's definition of done: seed the ICIMOD HKH inventory ∩ GLOF-II priority list,
≥25 lakes, real names/coordinates/dam type. On investigation, that specific dataset is
real but institutionally gated — ICIMOD's digital repository and GLOF-II's UNDP/Ministry
of Climate Change technical reports, not an openly downloadable point dataset. A DOI-
backed academic alternative exists (Zhang et al. 2022, *Earth System Science Data*, DOI
`10.12380/Glaci.msdc.000001`, covering exactly this region with 18 real attributes per
lake) but its shapefile sits behind an academic data portal needing a browser session and
likely registration — not something to do unilaterally in an agent session.

This is a GLOF early-warning system. Fabricating 25 plausible-looking coordinates to
satisfy the DoD's numeric bar would mean shipping invented safety data presented as real
inventory — a credibility and safety problem, not an acceptable prototype shortcut.

## Decision (Shaan, 2026-08-02)
Seed only what's individually verifiable against a real, citable source — six lakes
(Shishper, Khurdopin, Badswat, Passu, Ghulkin, Batura), each with its citation stored on
the row itself (`Lake.source` / `Lake.sourceUrl`, both part of the schema, `source`
required — not nullable). Two are peer-reviewed papers with an explicit GLOF event
documented (Shishper, Khurdopin); one derives from real published glacier IDs cited in a
paper but is explicitly marked approximate (Badswat); three are geographic-only
coordinates from Wikipedia/a tourism site with no specific event verified (Passu,
Ghulkin, Batura) — the confidence tier is visible in each `source` string, not smoothed
over.

`verify:lakes` was rewritten to match: it hard-fails on a missing citation or an invalid/
null-island geometry, but reports the 25-lake target as a tracked note, not a hard gate.
Hard-failing CI at "< 25" would just recreate the pressure to fabricate coordinates to
turn the check green.

## Consequences
- The Open Data API currently serves 6 real lakes, not the eventual 25+. Anyone reading
  `/lakes` sees exactly what's documented, with a citation per row — nothing is silently
  padded.
- Follow-up tracked as [CryoHealth-geo#4](https://github.com/uExel/CryoHealth-geo/issues/4):
  pull the DOI-backed CPEC dataset (or actual ICIMOD/GLOF-II files if institutional access
  is arranged), geoprocess to the approved shortlist on CryoHealth-geo#1, re-run
  `npm run seed:lakes` (idempotent — upserts by `slug`, safe to re-run against the six
  that already exist).
- `Lake.slug` (new, unique) is the seed's idempotency key, independent of `icimodId`
  (still null for every row here — nobody should read its absence as a bug; it's
  correctly empty until real ICIMOD IDs exist).
