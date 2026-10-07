import { readFileSync } from 'fs';
import { join } from 'path';
import {
  REGION_BBOX,
  RENAMED_FROM,
  RGI_EXTRACT_FILE,
  RGI_MATCHED,
  UNMATCHED,
} from './glaciers.seed-data';

function readExtract(): Map<string, Record<string, string>> {
  const [header, ...lines] = readFileSync(
    join(__dirname, RGI_EXTRACT_FILE),
    'utf8',
  )
    .trim()
    .split('\n');
  const cols = header.split(',');
  return new Map(
    lines.map((line) => {
      const cells = line.split(',');
      const row = Object.fromEntries(cols.map((c, i) => [c, cells[i]]));
      return [row.rgi_id, row];
    }),
  );
}

describe('glacier seed data (issue #14)', () => {
  const extract = readExtract();
  const inBbox = (lat: number, lng: number) =>
    lat >= REGION_BBOX.minLat &&
    lat <= REGION_BBOX.maxLat &&
    lng >= REGION_BBOX.minLng &&
    lng <= REGION_BBOX.maxLng;

  it('keeps all 32 named glaciers with unique names and RGI IDs', () => {
    const names = [...RGI_MATCHED, ...UNMATCHED].map((g) => g.name);
    expect(names).toHaveLength(32);
    expect(new Set(names).size).toBe(names.length);
    const ids = RGI_MATCHED.map((g) => g.rgiId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps all 13 team-reviewed glaciers (issue #14 follow-up)', () => {
    const names = new Set([...RGI_MATCHED, ...UNMATCHED].map((g) => g.name));
    for (const name of [
      'Pumarikish Glacier',
      'Ghandershish Glacier',
      'Haigatum Glacier',
      'Miar Glacier',
      'K2 / Godwin-Austen Glacier',
      'Trango Glacier',
      'Uli Biaho Glacier',
      'Chogo Lungma Glacier',
      'Shani Glacier',
      'Mashish Glacier',
      'Mazeno Glacier',
      'Badswat Glacier (G1)',
      'Ghompot Glacier',
    ]) {
      expect(names).toContain(name);
    }
  });

  it.each(RGI_MATCHED.map((g) => [g.name, g] as const))(
    '%s has a complete RGI v7.0 extract row inside the region',
    (_name, g) => {
      const row = extract.get(g.rgiId);
      expect(row).toBeDefined();
      for (const col of ['cenlat', 'cenlon', 'area_km2', 'lmax_m']) {
        expect(Number(row![col])).toBeGreaterThan(0);
      }
      expect(Number(row!.zmin_m)).toBeLessThan(Number(row!.zmax_m));
      expect(inBbox(Number(row!.cenlat), Number(row!.cenlon))).toBe(true);
      expect(g.notes.trim()).not.toBe('');
    },
  );

  it('records the spatial evidence for every outline RGI leaves unnamed', () => {
    for (const g of RGI_MATCHED) {
      if (extract.get(g.rgiId)!.glac_name === '') {
        expect(g.notes).toMatch(/matched spatially/);
      }
    }
  });

  it.each(UNMATCHED.map((g) => [g.name, g] as const))(
    '%s is cited and inside the region',
    (_name, g) => {
      expect(g.source.trim()).not.toBe('');
      expect(inBbox(g.lat, g.lng)).toBe(true);
      if (g.sourceUrl) expect(g.sourceUrl).toMatch(/^https:\/\//);
    },
  );

  it.each(UNMATCHED.filter((g) => g.measured).map((g) => [g.name, g] as const))(
    '%s only holds values its citation states',
    (_name, g) => {
      const m = g.measured!;
      expect(g.sourceUrl).toBeDefined();
      expect(m.observedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(m.observedAt))).toBe(false);
      const values = [m.lengthKm, m.areaKm2, m.elevationMinM, m.elevationMaxM];
      expect(values.some((v) => v !== undefined)).toBe(true);
      for (const v of values) {
        if (v === undefined) continue;
        expect(v).toBeGreaterThan(0);
        // The quoted figure must appear in the citation text itself.
        expect(g.source).toContain(String(v));
      }
      if (m.elevationMinM !== undefined && m.elevationMaxM !== undefined) {
        expect(m.elevationMinM).toBeLessThan(m.elevationMaxM);
      }
    },
  );

  it('renames only records that exist in RGI_MATCHED', () => {
    const matched = new Set(RGI_MATCHED.map((g) => g.name));
    for (const newName of Object.keys(RENAMED_FROM)) {
      expect(matched).toContain(newName);
    }
  });
});
