# Glacier seed data

## `rgi7-region14-extract.csv`

An attribute-only extract (no outlines) of the **Randolph Glacier Inventory v7.0**, region 14 (South Asia West). It contains one row for each glacier in `RGI_MATCHED` in `glaciers.seed-data.ts`.

- **Citation:** RGI 7.0 Consortium (2023). _Randolph Glacier Inventory – A Dataset of Global Glacier Outlines, Version 7.0._ NSIDC, Boulder, Colorado, USA. doi:[10.5067/f6jmovy5navz](https://doi.org/10.5067/f6jmovy5navz)
- **Retrieved:** 2026-10-06 from the GLIMS public GeoServer WFS, layer `GLIMS:RGI2000-v7.0-G-14_south_asia_west_epsg3857`. This serves the same RGI v7.0 product as the NSIDC download, which needs an Earthdata login.
- **Query:** the request was `GetFeature` with `propertyName=rgi_id,glims_id,glac_name,src_date,cenlat,cenlon,area_km2,lmax_m,zmin_m,zmax_m,term_type,surge_type` and `CQL_FILTER=cenlat BETWEEN 34.5 AND 37.2 AND cenlon BETWEEN 71.0 AND 77.9`. That returned 20,896 glaciers for the Gilgit-Baltistan + Chitral area, which were then trimmed to the matched IDs. `termlat`/`termlon` (the RGI terminus point) were added afterwards with a second request, `rgi_id IN (…)`, on the same layer.
- **Values:** the values are as published, without rounding. The seed converts units only: `lmax_m / 1000` gives `length_km`, and `zmin_m`/`zmax_m` are rounded to whole metres because those DB columns are integers. `term_type = 9` means _not assigned_ in RGI v7.0, so the seed stores `terminus_type` as NULL in that case.

## How the matching was done

1. **Seed RGI ID:** the record's RGI ID was checked against the extract, and the RGI `glac_name` had to agree.
2. **No RGI ID:** the record was matched on RGI `glac_name`, allowing for spelling variants (Koz/Qoz, Bazhin/Bazain, Toshain/Thoshai, Lupghar/Lunghar). An outline-containment check on the GeoNames point backed this up.
3. **Shishper:** Hassanabad (Shishper) was mapped to "Hasanabad Glacier II" on CryoHealth team confirmation.

4. **Unnamed outlines (2026-10-07):** Chogo Lungma, Shani, Mashish, Mazeno and Badswat (G1) were matched spatially on CryoHealth team instruction. The cited point lies inside the outline, or for Mazeno's GeoNames/OSM point, it is the only outline within 600 m. Badswat's cited G1 GLIMS ID matches the outline's own GLIMS ID. Its G2 is RGI `08628` and is not seeded. Each record's notes give the exact evidence.

A glacier whose point falls only inside a **larger** named glacier's outline (a tributary), or inside no outline at all (Ghompot), gets no RGI attributes. Those records are listed under `UNMATCHED`. Each one carries the citation the team supplied (paper DOI, USGS Professional Paper or GeoNames ID) and has no measurements until a value has been checked against the cited text.

## Districts

Each record's `district` in `glaciers.seed-data.ts` is the **geoBoundaries PAK ADM2** district that contains the glacier's RGI terminus point (`termlat`/`termlon`). Unmatched records use their cited point instead.

- **Dataset:** geoBoundaries PAK ADM2, boundary ID `PAK-ADM2-60131773`, year represented 2019, public domain. It was obtained from https://www.geoboundaries.org/api/current/gbOpen/PAK/ADM2/ on 2026-10-06.
- **Why the terminus:** downstream communities sit at the terminus. Hispar shows the difference: its centroid falls in Shigar, but its terminus, and the valley it drains, are in Nagar.
- **Siachen and Bilafond** are left blank on purpose because they are in a disputed area.
- **Boundaries file:** the district names are fixed in the data module, and the boundary file itself isn't committed. Re-run the point-in-polygon only if the boundaries or the extract change.

## Refreshing

To refresh, re-run the WFS request above, re-trim it to the IDs in `RGI_MATCHED`, and update the retrieval date here. Then run `npm run seed:glaciers && npm run verify:glaciers`.
