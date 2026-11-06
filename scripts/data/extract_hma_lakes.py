#!/usr/bin/env python3
"""
Derive the lake seed rows in src/lakes/data/hma-inventory.seed-data.ts from open data.
Standard library only; run with `python -I` so nothing is imported from the cwd.

    python -I scripts/data/extract_hma_lakes.py \
        --lakes-dbf   <dir>/Glacial_Lake_2022.dbf \
        --districts   <dir>/geoBoundaries-PAK-ADM2.geojson \
        --glacier-dir <dir containing hkh_glacier_2020.shp/.shx/.dbf> \
        --out         src/lakes/data/hma-inventory.seed-data.ts

Inputs (all open, none fabricated; see docs/ai/decisions/0004-hma-inventory-lakes.md):
  lakes      Kumar & Vijay 2025, Zenodo 10.5281/zenodo.17948783, CC BY 4.0
  districts  geoBoundaries gbOpen PAK ADM2 (2019), public domain
  glaciers   ICIMOD "Decadal glacier changes 1990-2020 in the HKH", 2020 outlines,
             DOI 10.26066/rds.1973447, CC BY 4.0

Selection (documented, deterministic):
  1. lake centroid falls inside a Gilgit-Baltistan or Khyber Pakhtunkhwa GLOF-II district
  2. lake area >= MIN_AREA_M2
  3. glacier contact: centroid is within CONTACT_BUFFER_M + the lake's equivalent radius
     of an ICIMOD 2020 glacier outline (the potentially-dangerous, glacier-fed class)
  4. rank by area, then round-robin across districts (at most PER_DISTRICT_CAP each)
     so one valley cannot crowd out the rest, until TARGET lakes are chosen.
"""
import argparse
import json
import math
import struct
from collections import defaultdict

MIN_AREA_M2 = 50_000          # 0.05 km2
CONTACT_BUFFER_M = 300
PER_DISTRICT_CAP = 4
TARGET = 25

GB_DISTRICTS = {
    'Astore', 'Diamer', 'Ghanche', 'Ghizer', 'Gilgit', 'Hunza',
    'Kharmang', 'Nagar', 'Shigar', 'Skardu',
}
KP_DISTRICTS = {
    'Chitral', 'Upper Dir', 'Lower Dir', 'Swat', 'Kohistan', 'Shangla',
    'Battagram', 'Mansehra',
}
LAKES_SOURCE_URL = 'https://doi.org/10.5281/zenodo.17948783'
LAKES_CITATION = (
    'Kumar, R. & Vijay, S. (2025), "Inventory of Glacial Lakes in High Mountain Asia for '
    'the Periods 2016-2017 and 2022-2024", Zenodo, CC BY 4.0, doi:10.5281/zenodo.17948783 '
    '(Glacial_Lake_2022, Sentinel-2)'
)
GLACIER_CITATION = (
    'glacier contact and sub-basin from ICIMOD (2026) "Decadal glacier changes from 1990 '
    'to 2020 in the Hindu Kush Himalaya", 2020 outlines, doi:10.26066/rds.1973447, CC BY 4.0'
)
BOUNDARY_CITATION = 'district from geoBoundaries gbOpen PAK ADM2 (2019), public domain'


def read_dbf(path, wanted):
    data = open(path, 'rb').read()
    n = struct.unpack('<I', data[4:8])[0]
    hl = struct.unpack('<H', data[8:10])[0]
    rl = struct.unpack('<H', data[10:12])[0]
    off, fields = 32, []
    while data[off] != 0x0D:
        fields.append((data[off:off + 11].split(b'\0')[0].decode(), data[off + 16]))
        off += 32
    for i in range(n):
        rec = data[hl + i * rl:hl + (i + 1) * rl]
        p, row = 1, {}
        for name, length in fields:
            if name in wanted:
                row[name] = rec[p:p + length].decode('latin1').strip()
            p += length
        yield row


def ring_contains(ring, x, y):
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]
        xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def load_districts(path):
    out = []
    for f in json.load(open(path))['features']:
        name = f['properties']['shapeName']
        if name not in GB_DISTRICTS | KP_DISTRICTS:
            continue
        g = f['geometry']
        polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        xs = [p[0] for poly in polys for p in poly[0]]
        ys = [p[1] for poly in polys for p in poly[0]]
        out.append((name, (min(xs), min(ys), max(xs), max(ys)), polys))
    return out


def district_of(districts, lon, lat):
    for name, (x0, y0, x1, y1), polys in districts:
        if not (x0 <= lon <= x1 and y0 <= lat <= y1):
            continue
        for poly in polys:
            if ring_contains(poly[0], lon, lat) and not any(ring_contains(h, lon, lat) for h in poly[1:]):
                return name
    return None


def albers_forward(lon, lat):
    """HKH_North_Albers_Equal_Area_Conic from the ICIMOD .prj (WGS84, ellipsoidal Albers,
    lon0 83, parallels 20/43, lat0 15, metres). Snyder, Map Projections, eq. 14-1..14-15."""
    a, f = 6378137.0, 1 / 298.257223563
    e2 = 2 * f - f * f
    e = math.sqrt(e2)

    def m(phi):
        return math.cos(phi) / math.sqrt(1 - e2 * math.sin(phi) ** 2)

    def q(phi):
        s = math.sin(phi)
        return (1 - e2) * (s / (1 - e2 * s * s) - math.log((1 - e * s) / (1 + e * s)) / (2 * e))

    p1, p2, p0 = (math.radians(v) for v in (20.0, 43.0, 15.0))
    n = (m(p1) ** 2 - m(p2) ** 2) / (q(p2) - q(p1))
    c = m(p1) ** 2 + n * q(p1)
    rho0 = a * math.sqrt(c - n * q(p0)) / n
    rho = a * math.sqrt(c - n * q(math.radians(lat))) / n
    theta = n * math.radians(lon - 83.0)
    return rho * math.sin(theta), rho0 - rho * math.cos(theta)


class Glaciers:
    """Random-access reader for the ICIMOD polygon shapefile (Albers metres) + its .dbf."""

    def __init__(self, folder, stem='hkh_glacier_2020'):
        self.shp = open(f'{folder}/{stem}.shp', 'rb')
        shx = open(f'{folder}/{stem}.shx', 'rb').read()
        self.count = (len(shx) - 100) // 8
        self.offsets = [struct.unpack('>I', shx[100 + 8 * i:104 + 8 * i])[0] * 2 for i in range(self.count)]
        self.attrs = list(read_dbf(f'{folder}/{stem}.dbf', {'Sub_Basin', 'Mt_Range', 'GLIMS_ID'}))
        assert len(self.attrs) == self.count, 'shp/dbf record counts differ'
        self.bboxes = []
        for off in self.offsets:
            self.shp.seek(off + 12)
            self.bboxes.append(struct.unpack('<4d', self.shp.read(32)))

    def rings(self, i):
        self.shp.seek(self.offsets[i] + 8)
        rec = self.shp.read(struct.unpack('>I', self._len(i))[0] * 2)
        n_parts, n_pts = struct.unpack('<2i', rec[36:44])
        parts = list(struct.unpack(f'<{n_parts}i', rec[44:44 + 4 * n_parts]))
        base = 44 + 4 * n_parts
        pts = [struct.unpack('<2d', rec[base + 16 * k:base + 16 * k + 16]) for k in range(n_pts)]
        parts.append(n_pts)
        return [pts[parts[k]:parts[k + 1]] for k in range(n_parts)]

    def _len(self, i):
        self.shp.seek(self.offsets[i] + 4)
        return self.shp.read(4)

    def nearest(self, lon, lat, max_m):
        """(distance_m, index) of the closest outline within max_m, else None.
        Equal-area projected metres: distances are accurate to ~1% across the region."""
        x, y = albers_forward(lon, lat)
        best = None
        for i, (x0, y0, x1, y1) in enumerate(self.bboxes):
            if x0 - max_m <= x <= x1 + max_m and y0 - max_m <= y <= y1 + max_m:
                d = self._distance(i, x, y)
                if d <= max_m and (best is None or d < best[0]):
                    best = (d, i)
        return best

    def _distance(self, i, x, y):
        best = float('inf')
        for ring in self.rings(i):
            if ring_contains(ring, x, y):
                return 0.0
            for (ax, ay), (bx, by) in zip(ring, ring[1:]):
                px, py, ex, ey = bx - ax, by - ay, x - ax, y - ay
                seg = px * px + py * py
                t = 0 if seg == 0 else max(0, min(1, (ex * px + ey * py) / seg))
                best = min(best, math.hypot(ex - t * px, ey - t * py))
        return best


def slug_for(lake_id):
    return 'hma-' + lake_id.lower().replace('_', '-').replace('.', '-')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--lakes-dbf', required=True)
    ap.add_argument('--districts', required=True)
    ap.add_argument('--glacier-dir', required=True)
    ap.add_argument('--out')
    args = ap.parse_args()

    districts = load_districts(args.districts)
    glaciers = Glaciers(args.glacier_dir)

    candidates = []
    seen = 0
    for r in read_dbf(args.lakes_dbf, {'ID', 'Latitude', 'Longitude', 'Lake_Elev', 'Area'}):
        lat, lon, area = float(r['Latitude']), float(r['Longitude']), float(r['Area'])
        if area < MIN_AREA_M2 or not (34.5 <= lat <= 37.2 and 71 <= lon <= 77.6):
            continue
        seen += 1
        d = district_of(districts, lon, lat)
        if d is None:
            continue
        radius = math.sqrt(area / math.pi)
        hit = glaciers.nearest(lon, lat, CONTACT_BUFFER_M + radius)
        if hit is None:
            continue
        g = glaciers.attrs[hit[1]]
        candidates.append({
            'id': r['ID'], 'lat': lat, 'lon': lon, 'area': area,
            'elev': int(float(r['Lake_Elev'] or 0)) or None,
            'district': d, 'subBasin': g['Sub_Basin'] or None,
            'glimsId': g['GLIMS_ID'], 'distM': round(hit[0]),
        })
    candidates.sort(key=lambda c: (-c['area'], c['id']))
    print(f'lakes >= {MIN_AREA_M2} m2 in region bbox: {seen}; in target districts with glacier contact: {len(candidates)}')

    per = defaultdict(list)
    for c in candidates:
        per[c['district']].append(c)
    print({k: len(v) for k, v in sorted(per.items())})

    chosen, rnd = [], 0
    while len(chosen) < TARGET and rnd < PER_DISTRICT_CAP:
        layer = [v[rnd] for v in per.values() if len(v) > rnd]
        layer.sort(key=lambda c: (-c['area'], c['id']))
        chosen.extend(layer[:TARGET - len(chosen)])
        rnd += 1
    chosen.sort(key=lambda c: (c['district'], -c['area']))
    for c in chosen:
        print(c['district'], c['id'], round(c['area'] / 1e6, 3), 'km2', c['elev'], c['subBasin'], c['distM'], 'm')
    print('chosen', len(chosen))

    if args.out:
        write_ts(args.out, chosen)


def write_ts(path, chosen):
    rows = []
    for c in chosen:
        province = 'Gilgit Baltistan' if c['district'] in GB_DISTRICTS else 'Khyber Pakhtunkhwa'
        valley = f"{c['subBasin']} sub-basin, {c['district']}" if c['subBasin'] else c['district']
        rows.append(
            '  {\n'
            f"    slug: '{slug_for(c['id'])}',\n"
            f"    name: 'Unnamed glacial lake {c['id']}',\n"
            f"    valley: {json.dumps(valley)},\n"
            f"    district: '{c['district']}',\n"
            f"    province: '{province}',\n"
            f"    lon: {c['lon']},\n"
            f"    lat: {c['lat']},\n"
            f"    elevationM: {c['elev'] if c['elev'] else 'null'},\n"
            f"    areaKm2: {round(c['area'] / 1e6, 6)},\n"
            f"    source: HMA_SOURCE,\n"
            '  },'
        )
    ts = f"""/**
 * Glacial lakes derived from open inventories. GENERATED by
 * scripts/data/extract_hma_lakes.py -- re-run it, do not hand-edit coordinates.
 * Method, thresholds and limits: docs/ai/decisions/0004-hma-inventory-lakes.md.
 *
 * These are inventory lakes, not the named GLOF-II priority list: they carry the
 * inventory's own ID as a name, damType 'unknown' and historicalGlof false (no event
 * verified). glacierContact is true for every row by construction of the selection rule.
 */

export type HmaLakeSeed = {{
  slug: string;
  name: string;
  valley: string;
  district: string;
  province: 'Gilgit Baltistan' | 'Khyber Pakhtunkhwa';
  lon: number;
  lat: number;
  elevationM: number | null;
  areaKm2: number;
  source: string;
}};

export const HMA_SOURCE_URL = '{LAKES_SOURCE_URL}';

const HMA_SOURCE =
  '{LAKES_CITATION}; ' +
  '{BOUNDARY_CITATION}; ' +
  '{GLACIER_CITATION}';

export const HMA_LAKE_SEEDS: HmaLakeSeed[] = [
{chr(10).join(rows)}
];
"""
    open(path, 'w', encoding='utf-8', newline='\n').write(ts)
    print('wrote', path)


if __name__ == '__main__':
    main()
