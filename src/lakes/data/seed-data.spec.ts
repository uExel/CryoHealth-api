import { LAKE_SEEDS } from './lakes.seed-data';
import { HMA_LAKE_SEEDS, HMA_SOURCE_URL } from './hma-inventory.seed-data';

/**
 * Guards the provenance rules from ADR 0002/0004 at the data level, so a bad edit to a
 * seed file fails in CI instead of shipping an uncited or misplaced lake.
 */
describe('lake seed data', () => {
  const all = [...LAKE_SEEDS, ...HMA_LAKE_SEEDS];

  it('meets the 25-lake target of issue #1', () => {
    expect(all.length).toBeGreaterThanOrEqual(25);
  });

  it('has unique slugs across both files', () => {
    const slugs = all.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('cites a source on every lake', () => {
    for (const l of all) {
      expect(l.source.trim().length).toBeGreaterThan(20);
    }
    expect(HMA_SOURCE_URL).toMatch(/^https:\/\/doi\.org\/10\.5281\/zenodo\./);
  });

  describe('inventory lakes', () => {
    it('sit inside Gilgit-Baltistan / Khyber Pakhtunkhwa glacier country', () => {
      for (const l of HMA_LAKE_SEEDS) {
        expect(l.lat).toBeGreaterThan(34.5);
        expect(l.lat).toBeLessThan(37.2);
        expect(l.lon).toBeGreaterThan(71);
        expect(l.lon).toBeLessThan(77.6);
      }
    });

    it('carry real measurements and no invented classification', () => {
      for (const l of HMA_LAKE_SEEDS) {
        expect(l.areaKm2).toBeGreaterThanOrEqual(0.05);
        expect(l.elevationM === null || l.elevationM > 1000).toBe(true);
        expect(l.name).toMatch(/^Unnamed glacial lake GL_/);
        expect(['Gilgit Baltistan', 'Khyber Pakhtunkhwa']).toContain(
          l.province,
        );
      }
    });

    it('spreads across districts instead of piling into one valley', () => {
      const perDistrict = new Map<string, number>();
      for (const l of HMA_LAKE_SEEDS) {
        perDistrict.set(l.district, (perDistrict.get(l.district) ?? 0) + 1);
      }
      expect(perDistrict.size).toBeGreaterThanOrEqual(8);
      expect(Math.max(...perDistrict.values())).toBeLessThanOrEqual(4);
    });
  });
});
