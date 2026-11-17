"""Cross-check the seeded lakes against an independent open lake-outline dataset.

Dataset: HKH-PK-2020, Zenodo record 15476013, DOI 10.5281/zenodo.15476013, CC BY 4.0
(8,808 manually delineated lake outlines, Pakistan HKH, PlanetScope, September 2020).

WARNING (found while writing this): the Zenodo page says EPSG:4326, but the shapefile's
.prj and its coordinates are WGS 84 / UTM zone 43N, in metres. Read as lon/lat every lake
lands in the wrong place. This script converts UTM 43N -> lon/lat itself (stdlib only) and
round-trip-tests the conversion before using it.

Usage (python -I, standard library only):
  python -I crosscheck_seeds.py <path/to/HKH-PK (no extension)> <src/lakes/data/lakes.seed-data.ts>

It prints, per seeded lake: whether the point falls inside an outline, the distance to the
nearest outline centroid, and the nearest candidate outlines (OBJECTID_1, lon, lat, area).
It never writes to the database and never changes the seed data.
"""
import math
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from shp_lib import read_shp, read_dbf, ring_area_centroid, haversine_km, point_in_ring  # noqa: E402

# WGS84 / UTM zone 43N (central meridian 75E, k0 0.9996, false easting 500000, false northing 0)
A = 6378137.0
F = 1 / 298.257223563
K0 = 0.9996
E2 = F * (2 - F)
EP2 = E2 / (1 - E2)
LON0 = math.radians(75.0)


def utm_to_lonlat(x, y):
    """Standard inverse transverse Mercator (Snyder, USGS PP 1395, eq. 8-17 .. 8-25)."""
    x -= 500000.0
    m = y / K0
    mu = m / (A * (1 - E2 / 4 - 3 * E2 ** 2 / 64 - 5 * E2 ** 3 / 256))
    e1 = (1 - math.sqrt(1 - E2)) / (1 + math.sqrt(1 - E2))
    phi1 = (mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * math.sin(2 * mu)
            + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * math.sin(4 * mu)
            + (151 * e1 ** 3 / 96) * math.sin(6 * mu)
            + (1097 * e1 ** 4 / 512) * math.sin(8 * mu))
    s, c, t = math.sin(phi1), math.cos(phi1), math.tan(phi1)
    n1 = A / math.sqrt(1 - E2 * s * s)
    t1 = t * t
    c1 = EP2 * c * c
    r1 = A * (1 - E2) / (1 - E2 * s * s) ** 1.5
    d = x / (n1 * K0)
    lat = phi1 - (n1 * t / r1) * (d ** 2 / 2 - (5 + 3 * t1 + 10 * c1 - 4 * c1 ** 2 - 9 * EP2) * d ** 4 / 24
                                  + (61 + 90 * t1 + 298 * c1 + 45 * t1 ** 2 - 252 * EP2 - 3 * c1 ** 2) * d ** 6 / 720)
    lon = LON0 + (d - (1 + 2 * t1 + c1) * d ** 3 / 6
                  + (5 - 2 * c1 + 28 * t1 - 3 * c1 ** 2 + 8 * EP2 + 24 * t1 ** 2) * d ** 5 / 120) / c
    return math.degrees(lon), math.degrees(lat)


def lonlat_to_utm(lon, lat):
    """Forward transform, used ONLY to round-trip test utm_to_lonlat."""
    phi, lam = math.radians(lat), math.radians(lon)
    n = A / math.sqrt(1 - E2 * math.sin(phi) ** 2)
    t = math.tan(phi) ** 2
    c = EP2 * math.cos(phi) ** 2
    a_ = (lam - LON0) * math.cos(phi)
    m = A * ((1 - E2 / 4 - 3 * E2 ** 2 / 64 - 5 * E2 ** 3 / 256) * phi
             - (3 * E2 / 8 + 3 * E2 ** 2 / 32 + 45 * E2 ** 3 / 1024) * math.sin(2 * phi)
             + (15 * E2 ** 2 / 256 + 45 * E2 ** 3 / 1024) * math.sin(4 * phi)
             - (35 * E2 ** 3 / 3072) * math.sin(6 * phi))
    x = K0 * n * (a_ + (1 - t + c) * a_ ** 3 / 6 + (5 - 18 * t + t * t + 72 * c - 58 * EP2) * a_ ** 5 / 120) + 500000.0
    y = K0 * (m + n * math.tan(phi) * (a_ ** 2 / 2 + (5 - t + 9 * c + 4 * c * c) * a_ ** 4 / 24
                                       + (61 - 58 * t + t * t + 600 * c - 330 * EP2) * a_ ** 6 / 720))
    return x, y


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    base, seed_ts = sys.argv[1], sys.argv[2]

    # 1. The projection code must round-trip before we trust anything it produces.
    worst = 0.0
    for lon, lat in [(74.61, 36.4), (75.5083, 36.3383), (72.0, 35.0), (77.5, 37.0), (73.0, 34.5)]:
        x, y = lonlat_to_utm(lon, lat)
        lo2, la2 = utm_to_lonlat(x, y)
        worst = max(worst, haversine_km(lon, lat, lo2, la2) * 1000)
    print('projection round-trip worst error: %.4f m' % worst)
    if worst >= 1.0:
        sys.exit('projection round-trip failed - refusing to continue')
    lo, _la = utm_to_lonlat(500000.0, 4000000.0)
    if abs(lo - 75.0) > 1e-9:
        sys.exit('central meridian check failed - refusing to continue')

    # 2. Load the outlines and convert every ring to lon/lat.
    _fields, rows = read_dbf(base + '.dbf')
    _st, shapes = read_shp(base + '.shp')
    if len(rows) != len(shapes):
        sys.exit('dbf/shp record count differs: %d vs %d' % (len(rows), len(shapes)))
    polys = []
    for row, s in zip(rows, shapes):
        rings = [[utm_to_lonlat(x, y) for x, y in ring] for ring in s['parts']]
        _a, cx, cy = ring_area_centroid(rings[0])
        polys.append({'id': int(row['OBJECTID_1']), 'area_m2': row['Shape_Area'], 'rings': rings, 'cx': cx, 'cy': cy})
    print('outlines: %d  lon %.3f..%.3f  lat %.3f..%.3f' % (
        len(polys), min(p['cx'] for p in polys), max(p['cx'] for p in polys),
        min(p['cy'] for p in polys), max(p['cy'] for p in polys)))

    # 3. Seeds are read straight from the TypeScript data file, so this cannot drift from it.
    ts = open(seed_ts, encoding='utf-8').read()
    seeds = [(m.group(1), float(m.group(2)), float(m.group(3)))
             for m in re.finditer(r"slug: '([^']+)'.*?lon: ([0-9.]+),\s*lat: ([0-9.]+),", ts, re.S)]
    print('seed lakes parsed: %d\n' % len(seeds))

    for slug, lon, lat in seeds:
        dist = sorted(((haversine_km(lon, lat, p['cx'], p['cy']), p) for p in polys), key=lambda t: t[0])
        inside = [p for p in polys if point_in_ring(lon, lat, p['rings'][0])]
        counts = [sum(1 for d, _p in dist if d <= k) for k in (1, 2, 5, 10)]
        print('%-10s (%.4f, %.4f)  inside an outline: %-5s  nearest centroid: %.2f km  outlines within 1/2/5/10 km: %s' % (
            slug, lon, lat, 'yes' if inside else 'no', dist[0][0], counts))
        for d, p in dist[:3]:
            print('    candidate OBJECTID_1=%-5d  lon %.5f  lat %.5f  area %9.0f m2  %.2f km away' % (
                p['id'], p['cx'], p['cy'], p['area_m2'], d))


if __name__ == '__main__':
    main()
