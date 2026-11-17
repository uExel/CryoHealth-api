/**
 * Idempotent lake seed — upserts by slug. Safe to re-run (matches the harness's
 * onboarding philosophy: running it twice produces no surprise diff, just an
 * "updated" count instead of "inserted").
 *
 * Two sources, both with a citation on every row:
 *  - src/lakes/data/lakes.seed-data.ts: six named lakes verified one by one (ADR 0002)
 *  - src/lakes/data/hma-inventory.seed-data.ts: inventory-derived glacial lakes, generated
 *    from open datasets by scripts/data/extract_hma_lakes.py (ADR 0004)
 *
 * It also makes sure each lake's district exists and links `district_id`, so the
 * dashboard's district views work without running the dev-data seed.
 */
import 'reflect-metadata';
import dataSource from '../src/database/data-source';
import { LAKE_SEEDS } from '../src/lakes/data/lakes.seed-data';
import {
  HMA_LAKE_SEEDS,
  HMA_SOURCE_URL,
} from '../src/lakes/data/hma-inventory.seed-data';

type SeedRow = {
  slug: string;
  name: string;
  valley: string;
  district: string;
  province: string;
  damType: string;
  glacierContact: boolean;
  historicalGlof: boolean;
  lon: number;
  lat: number;
  elevationM: number | null;
  areaKm2: number | null;
  source: string;
  sourceUrl: string;
};

// The six named lakes all sit in Gilgit-Baltistan (Hunza, Ghizer).
const NAMED_LAKE_PROVINCE = 'Gilgit Baltistan';

function allSeeds(): SeedRow[] {
  const named: SeedRow[] = LAKE_SEEDS.map((l) => ({
    ...l,
    province: NAMED_LAKE_PROVINCE,
    elevationM: null,
    areaKm2: null,
  }));
  const inventory: SeedRow[] = HMA_LAKE_SEEDS.map((l) => ({
    ...l,
    damType: 'unknown',
    glacierContact: true,
    historicalGlof: false,
    sourceUrl: HMA_SOURCE_URL,
  }));
  return [...named, ...inventory];
}

async function main() {
  const seeds = allSeeds();
  const slugs = new Set(seeds.map((s) => s.slug));
  if (slugs.size !== seeds.length) {
    throw new Error('Duplicate lake slug across seed files');
  }

  await dataSource.initialize();
  try {
    const districts = new Map(seeds.map((s) => [s.district, s.province]));
    for (const [name, province] of districts) {
      await dataSource.query(
        `INSERT INTO districts (name, province) VALUES ($1, $2)
         ON CONFLICT (name) DO NOTHING`,
        [name, province],
      );
    }

    let inserted = 0;
    let updated = 0;
    for (const lake of seeds) {
      const result = await dataSource.query(
        `INSERT INTO lakes (slug, name, valley, district, "damType", "glacierContact", "historicalGlof", source, "sourceUrl", "elevationM", area_km2, geom)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, ST_SetSRID(ST_MakePoint($12,$13),4326))
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           valley = EXCLUDED.valley,
           district = EXCLUDED.district,
           "damType" = EXCLUDED."damType",
           "glacierContact" = EXCLUDED."glacierContact",
           "historicalGlof" = EXCLUDED."historicalGlof",
           source = EXCLUDED.source,
           "sourceUrl" = EXCLUDED."sourceUrl",
           "elevationM" = COALESCE(EXCLUDED."elevationM", lakes."elevationM"),
           area_km2 = COALESCE(EXCLUDED.area_km2, lakes.area_km2),
           geom = EXCLUDED.geom
         RETURNING (xmax = 0) AS inserted`,
        [
          lake.slug,
          lake.name,
          lake.valley,
          lake.district,
          lake.damType,
          lake.glacierContact,
          lake.historicalGlof,
          lake.source,
          lake.sourceUrl,
          lake.elevationM,
          lake.areaKm2,
          lake.lon,
          lake.lat,
        ],
      );
      if (result[0]?.inserted) inserted++;
      else updated++;
    }

    await dataSource.query(
      `UPDATE lakes SET district_id = d.id FROM districts d
       WHERE lakes.district = d.name AND lakes.district_id IS NULL`,
    );

    console.log(
      `Seeded lakes: ${inserted} inserted, ${updated} updated, ${seeds.length} total ` +
        `(${LAKE_SEEDS.length} named + ${HMA_LAKE_SEEDS.length} inventory) across ${districts.size} districts.`,
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
