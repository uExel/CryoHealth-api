# ADR 0005 — Open lake-outline dataset: what it can and cannot do for the lake inventory

Status: findings only. No lake rows, schema, or runtime code change. Refs #1 (criterion 3,
"≥25 real lakes"). Follow-up to [ADR 0002](0002-lake-data-provenance.md). Written alongside
ADR 0004 (inventory-derived lakes, branch `feat/1-hma-inventory-lakes`), whose lake positions
this dataset independently checks; see "Cross-check of the inventory-derived lakes".

## Context
ADR 0002 left the 25-lake target open because the ICIMOD / GLOF-II inventory and the Zhang
et al. 2022 CPEC shapefile sit behind gated portals. This checks whether an **openly
downloadable** dataset can close the gap, and uses it to cross-check the six lakes we
already serve.

Dataset found: **HKH-PK-2020**, Zenodo record 15476013, DOI `10.5281/zenodo.15476013`,
licence CC BY 4.0. 8,808 manually delineated lake outlines for Pakistan's Hindu Kush-
Himalaya from PlanetScope imagery of **September 2020** (about 136 km² in total).
Cite as Siddique et al., IGARSS 2023, DOI `10.1109/IGARSS52108.2023.10281471`.
File `HKH-PK.zip`, 4,553,341 bytes, MD5 `3a853833bfe35de751abcb93e544c15e` (matches the
record).

## What was found

1. **The record's CRS is wrong.** The Zenodo page says EPSG:4326. The shapefile's `.prj`
   and its coordinates are **WGS 84 / UTM zone 43N, in metres** (eastings 153,349 to
   700,878). Read as lon/lat, every lake lands in the wrong place. Anyone importing it
   must reproject first. `scripts/lake-crosscheck/` does this with the standard library and
   round-trip-tests the conversion (worst error 0.0003 m; converted extent 71.15–78.53°E,
   34.48–37.10°N, which is Pakistan's HKH).
2. **It has no names and no hazard information.** The only fields are `OBJECTID_1`, `Id`,
   `OBJECTID`, `Shape_Leng`, `Shape_Le_1`, `Shape_Area`. There is no lake name, valley,
   district, dam type, glacier contact, GLOF history, or ICIMOD / GLIMS id.
   [CryoHealth-geo#1](https://github.com/uExel/CryoHealth-geo/issues/1) asks for
   "verified ICIMOD/GLIMS IDs"; this dataset cannot supply them.
3. **None of our six seed points falls inside an outline.** Distance from the seeded
   coordinate to the nearest outline centroid:

   | Lake | Nearest outline centroid | Outlines within 5 km | Nearest outline (OBJECTID_1, area) |
   |---|---|---|---|
   | shishper | 9.71 km | 0 | 5942, 3,676 m² |
   | khurdopin | 2.33 km | 14 | 5713, 547 m² |
   | badswat | 4.78 km | 1 | 6887, 3,220 m² |
   | passu | 2.65 km | 13 | 5940, 987 m² |
   | ghulkin | 3.77 km | 27 | 5876, 3,540 m² |
   | batura | 1.85 km | 19 | 5825, 5,591 m² |

   The nearest outline is not necessarily the right lake (Passu has a 27,819 m² outline
   4.0 km away, Ghulkin a 127,383 m² one at 4.0 km). That ambiguity is the point: the data
   cannot say which outline is which named lake.

## What this does and does not show
- It does **not** show the six rows are wrong. The dataset is one date (September 2020).
  Shishper and Khurdopin are ice-dammed lakes that fill and drain, so a lake that existed
  in 2018–2019 may simply be absent. Shishper's coordinate has two decimals (about 1 km
  resolution). The three Wikipedia / tourism-site rows are glacier-level coordinates by
  design (see ADR 0002's confidence tiers).
- It does show that **the six coordinates are not lake-centroid precision**: nothing here
  confirms any of them to better than a few kilometres. The `source` strings already say
  this for Badswat, Passu, Ghulkin and Batura; it is equally true of the other two.
- Therefore **nothing was changed**. Snapping a seed to "the nearest outline" would be a
  guess presented as survey data, which ADR 0002 rejects.

## Cross-check of the inventory-derived lakes
ADR 0004 adds 25 unnamed lakes taken from a different source (Kumar & Vijay 2025, Sentinel-2,
2022). HKH-PK-2020 is independent of it (different sensor, date and method), so it can test
those positions. Result, using the same tool on `src/lakes/data/hma-inventory.seed-data.ts`:
- **23 of 25 lie within 100 m of an HKH-PK-2020 outline** (22 inside one, 1 within 10 m of a
  centroid), and their areas agree: ratio inventory/outline 0.86 to 1.14, median 0.98.
- **2 could not be checked**: both in Ghanche, 77.14 E and 77.57 E, where the nearest
  outline is 14 km and 35 km away. HKH-PK-2020 does not cover that area, so this says nothing
  for or against them. A person should confirm they belong in the inventory.
- This supports the positions and sizes of the 25 lakes. It does not make them the named
  GLOF-II shortlist, give them a dam type, or say they are dangerous.

## Decision
- Keep the six rows exactly as they are. Do not add rows from this dataset by choosing
  outlines automatically (largest, nearest, or "in the right valley"): the dataset cannot
  say which outline is which named lake, or whether it is dangerous.
- Criterion 3 of #1 (a count of 25) is met only if the ADR 0004 PR merges; the **named**
  shortlist from CryoHealth-geo#1 stays open either way. A route to the named lakes needs one of:
  1. A person who knows the shortlist (CryoHealth-geo#1) picks the outline for each named
     lake using the candidate list from `scripts/lake-crosscheck/` plus imagery, and the
     seed records the outline's `OBJECTID_1`, the DOI and the licence in `source`.
     Attribution under CC BY 4.0 is then required.
  2. The Zhang et al. 2022 shapefile (18 attributes per lake) or the ICIMOD / GLOF-II
     files, once someone with portal access downloads them (CryoHealth-geo#4).
- If an outline-based import is ever built, it must reproject from UTM 43N first, and
  `verify:lakes` should be extended to fail any lake whose point lies outside every outline
  it cites.

## Reproduce
```bash
mkdir -p /tmp/hkhpk && cd /tmp/hkhpk
curl -sSL -o HKH-PK.zip "https://zenodo.org/records/15476013/files/HKH-PK.zip?download=1"
md5sum HKH-PK.zip        # 3a853833bfe35de751abcb93e544c15e
unzip -q HKH-PK.zip -d x
python -I scripts/lake-crosscheck/crosscheck_seeds.py /tmp/hkhpk/x/HKH-PK/HKH-PK src/lakes/data/lakes.seed-data.ts
# inventory-derived lakes (needs the ADR 0004 branch): positions, then areas
python -I scripts/lake-crosscheck/crosscheck_seeds.py /tmp/hkhpk/x/HKH-PK/HKH-PK src/lakes/data/hma-inventory.seed-data.ts
python -I scripts/lake-crosscheck/compare_areas.py /tmp/hkhpk/x/HKH-PK/HKH-PK src/lakes/data/hma-inventory.seed-data.ts
```
Run it from outside the extracted folder. It reads only; it does not touch the database.
