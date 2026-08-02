/**
 * Idempotent lake seed — upserts by slug. Safe to re-run (matches the harness's
 * onboarding philosophy: running it twice produces no surprise diff, just an
 * "updated" count instead of "inserted"). See src/lakes/data/lakes.seed-data.ts for
 * what's here and why it's six lakes, not the originally-scoped 25.
 */
import 'reflect-metadata';
import dataSource from '../src/database/data-source';
import { LAKE_SEEDS } from '../src/lakes/data/lakes.seed-data';

async function main() {
  await dataSource.initialize();
  try {
    let inserted = 0;
    let updated = 0;
    for (const lake of LAKE_SEEDS) {
      const result = await dataSource.query(
        `INSERT INTO lakes (slug, name, valley, district, "damType", "glacierContact", "historicalGlof", source, "sourceUrl", geom)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, ST_SetSRID(ST_MakePoint($10,$11),4326))
         ON CONFLICT (slug) DO UPDATE SET
           name = EXCLUDED.name,
           valley = EXCLUDED.valley,
           district = EXCLUDED.district,
           "damType" = EXCLUDED."damType",
           "glacierContact" = EXCLUDED."glacierContact",
           "historicalGlof" = EXCLUDED."historicalGlof",
           source = EXCLUDED.source,
           "sourceUrl" = EXCLUDED."sourceUrl",
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
          lake.lon,
          lake.lat,
        ],
      );
      if (result[0]?.inserted) inserted++;
      else updated++;
    }
    console.log(`Seeded lakes: ${inserted} inserted, ${updated} updated, ${LAKE_SEEDS.length} total.`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
