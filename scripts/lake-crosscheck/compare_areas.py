"""Compare the inventory lakes' own area with the independent HKH-PK-2020 outline they sit on.

Usage (python -I, standard library only):
  python -I compare_areas.py <path/to/HKH-PK (no extension)> <src/lakes/data/hma-inventory.seed-data.ts>

Reads `slug`, `district`, `lon`, `lat` and `areaKm2` from the TypeScript seed file, converts the
dataset from UTM 43N (see crosscheck_seeds.py), and for each lake reports the nearest outline's
distance and area. A lake counts as matched when an outline centroid is within 100 m. Read-only.
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from crosscheck_seeds import utm_to_lonlat  # noqa: E402
from shp_lib import read_dbf, read_shp, ring_area_centroid, haversine_km  # noqa: E402

MATCH_KM = 0.1


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    base, seed_ts = sys.argv[1], sys.argv[2]
    _f, rows = read_dbf(base + '.dbf')
    _s, shapes = read_shp(base + '.shp')
    if len(rows) != len(shapes):
        sys.exit('dbf/shp record count differs: %d vs %d' % (len(rows), len(shapes)))
    polys = []
    for row, s in zip(rows, shapes):
        ring = [utm_to_lonlat(x, y) for x, y in s['parts'][0]]
        _a, cx, cy = ring_area_centroid(ring)
        polys.append((row['Shape_Area'], cx, cy))

    txt = open(seed_ts, encoding='utf-8').read()
    items = re.findall(r"slug: '([^']+)'.*?district: '([^']+)'.*?lon: ([0-9.]+),\s*lat: ([0-9.]+),.*?areaKm2: ([0-9.]+)", txt, re.S)
    if not items:
        sys.exit('no lakes with areaKm2 found in ' + seed_ts)

    ratios = []
    for slug, district, lon, lat, area_km2 in items:
        lon, lat, inv = float(lon), float(lat), float(area_km2) * 1e6
        dist, area = min((haversine_km(lon, lat, cx, cy), ar) for ar, cx, cy in polys)
        ratio = inv / area if dist <= MATCH_KM else None
        if ratio is not None:
            ratios.append(ratio)
        print('%-26s %-10s inventory %8.0f m2  nearest outline %6.2f km  %8.0f m2  ratio %s' % (
            slug, district, inv, dist, area, '%.2f' % ratio if ratio is not None else 'n/a'))
    ratios.sort()
    print('\nmatched within %.0f m: %d of %d' % (MATCH_KM * 1000, len(ratios), len(items)))
    if ratios:
        print('area ratio min %.2f  median %.2f  max %.2f' % (ratios[0], ratios[len(ratios) // 2], ratios[-1]))


if __name__ == '__main__':
    main()
