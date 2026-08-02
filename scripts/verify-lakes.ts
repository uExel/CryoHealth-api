/**
 * Verifies data integrity, not an arbitrary headcount. Task #5's original DoD said
 * "asserts count >= 25" — that number assumed access to the full ICIMOD/GLOF-II
 * geodatabase, which turned out to be institutionally gated, not openly downloadable
 * (see src/lakes/data/lakes.seed-data.ts and docs/ai/decisions/0002). Hard-failing CI
 * at "< 25" from here would just recreate the pressure to fabricate coordinates to make
 * the number green. So the hard gate is: every lake has a real citation and a valid,
 * non-null-island geometry. The 25-lake target is reported, not enforced.
 */
import 'reflect-metadata';
import dataSource from '../src/database/data-source';

type Row = { id: string; name: string; source: string | null; valid: boolean; lon: number; lat: number };

async function main() {
  await dataSource.initialize();
  try {
    const rows: Row[] = await dataSource.query(`
      SELECT id, name, source, ST_IsValid(geom) AS valid, ST_X(geom) AS lon, ST_Y(geom) AS lat
      FROM lakes
    `);

    if (rows.length === 0) {
      console.error('FAIL: no lakes in the table. Run `npm run seed:lakes` first.');
      process.exit(1);
    }

    const problems: string[] = [];
    for (const r of rows) {
      if (!r.source || !r.source.trim()) problems.push(`${r.name}: missing source citation`);
      if (!r.valid) problems.push(`${r.name}: invalid geometry`);
      if (r.lon === 0 && r.lat === 0) problems.push(`${r.name}: geometry at (0,0) — null island, almost certainly a placeholder`);
    }

    console.log(`${rows.length} lake(s) in the table.`);
    if (problems.length > 0) {
      console.error(`FAIL: ${problems.length} integrity problem(s):`);
      problems.forEach((p) => console.error(`  - ${p}`));
      process.exit(1);
    }

    console.log('OK: every lake has a cited source and a valid, non-null-island geometry.');
    if (rows.length < 25) {
      console.log(
        `NOTE: ${rows.length}/25 — task #5's original target. Tracked gap, not a silent shortfall: ` +
          'the remaining lakes need the actual ICIMOD/GLOF-II geodatabase (docs/ai/decisions/0002).',
      );
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
