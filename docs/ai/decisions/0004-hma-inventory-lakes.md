# ADR 0004 — Inventory-derived lakes close the ≥25-lake target of issue #1

## Context
[ADR 0002](0002-lake-data-provenance.md) kept the seed at six individually cited, named
lakes because the ICIMOD / GLOF-II inventory is access-gated and padding to 25 with
unverified coordinates was rejected. Issue #1's last open criterion was "≥25 lakes, real
coordinates". Three things changed:

- An open, citable lake inventory exists: Kumar & Vijay (2025), *Inventory of Glacial
  Lakes in High Mountain Asia for the Periods 2016-2017 and 2022-2024*, Zenodo
  [10.5281/zenodo.17948783](https://doi.org/10.5281/zenodo.17948783), CC BY 4.0
  (31,698 lakes from Sentinel-2, with ID, latitude/longitude, elevation, area).
- ICIMOD's 2020 glacier outlines (*Decadal glacier changes from 1990 to 2020 in the
  Hindu Kush Himalaya*, DOI 10.26066/rds.1973447, CC BY 4.0) are available locally.
- geoBoundaries gbOpen PAK ADM2 (2019, public domain) gives district polygons.

## Decision
Add 25 lakes derived from those three open datasets, by a committed, re-runnable script
(`scripts/data/extract_hma_lakes.py`, stdlib only) writing
`src/lakes/data/hma-inventory.seed-data.ts`. Selection:

1. Lake centroid lies inside a Gilgit-Baltistan or Khyber Pakhtunkhwa GLOF district.
2. Area ≥ 0.05 km² (2022 scene).
3. Glacier contact: centroid within 300 m + the lake's equivalent radius of a 2020 ICIMOD
   glacier outline (the glacier-fed, potentially dangerous class). Outlines are in the
   HKH Albers projection; the script projects lake points with the `.prj` parameters.
4. Rank by area, round-robin across districts, at most 4 per district.

Of 562 lakes ≥ 0.05 km² in the region, 57 pass 1–3; the script picks 25 across 11 districts.

What each column means for these rows (nothing is invented):

| Column | Value | Basis |
|---|---|---|
| `name` | `Unnamed glacial lake GL_<lat>_<lon>` | the inventory has IDs, not names |
| `damType` | `unknown` | not in any source used |
| `historicalGlof` | `false` | means "no event verified", as for Passu/Ghulkin/Batura |
| `glacierContact` | `true` | by the selection rule above |
| `valley` | ICIMOD sub-basin of the nearest outline + district | ICIMOD `Sub_Basin` |
| `district` / `districts` row | polygon containing the centroid | geoBoundaries |
| `elevationM`, `area_km2` | inventory `Lake_Elev`, `Area` (2022 scene) | Zenodo dataset |
| `icimodId` | left null | this is not an ICIMOD lake ID |

The existing six named lakes are untouched. `npm run seed:lakes` upserts both sets by
`slug`, creates missing `districts` rows (`ON CONFLICT DO NOTHING`) and links
`lakes.district_id`. `verify:lakes` now also requires `sourceUrl` and a district link, and
reports the 25-lake target as met.

## Limits (read before relying on it)
- **This is not the named GLOF-II priority list.** Shishper, Hinarche, Karambar, Darkut and
  the rest of the shortlist on CryoHealth-geo#1 still need a named source; CryoHealth-geo#4
  stays open for that.
- **Hunza and Nagar are thin in the inventory** (21 and 2 lakes total) — the Karakoram's
  ice-dammed lakes are often drained or ice-covered in a single scene. That is why the
  named Hunza lakes stay hand-cited. No inventory lake matched any of the six named lakes
  within 4 km, so they are not duplicated here; their approximate coordinates (ADR 0002)
  could not be cross-checked against this dataset and may be off by kilometres.
- Glacier contact is a distance heuristic on a centroid, not a polygon intersection with
  the lake outline. Dam type, volume and downstream exposure are not assessed.
- 2022 single-scene extents; lake area varies seasonally.
- The inventory is not a hazard ranking. Tier and alert policy remain code plus humans
  (CLAUDE.md); nothing here assigns a tier.

## Reproducing
Download the three inputs, then:
```
python -I scripts/data/extract_hma_lakes.py \
  --lakes-dbf Glacial_Lake_2022.dbf --districts geoBoundaries-PAK-ADM2.geojson \
  --glacier-dir <folder with hkh_glacier_2020.shp/.shx/.dbf> \
  --out src/lakes/data/hma-inventory.seed-data.ts
npm run seed:lakes && npm run verify:lakes
```
Attribution (CC BY 4.0) is carried in every row's `source` and `sourceUrl`.
