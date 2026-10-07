/**
 * Verifies glacier data integrity (issue #14), mirroring verify-lakes.ts: the gate is
 * provenance, not a headcount. Hard-fails when any glacier row
 *  - has no source citation,
 *  - has a NULL rgi_id without being one of the explicitly registered UNMATCHED
 *    records in src/glaciers/data/glaciers.seed-data.ts, or is such a record whose
 *    values differ from what its citation states,
 *  - lies outside the Gilgit-Baltistan / Chitral envelope,
 *  - has a non-positive area or length, or an inverted elevation range,
 * or when an RGI_MATCHED glacier is missing, isn't cited to RGI v7.0, or has no
 * RGI baseline observation.
 */
import 'reflect-metadata';
import dataSource from '../src/database/data-source';
import {
  REGION_BBOX,
  RGI_MATCHED,
  RGI_SOURCE,
  UNMATCHED,
} from '../src/glaciers/data/glaciers.seed-data';

type Row = {
  name: string;
  rgi_id: string | null;
  source: string | null;
  lat: number;
  lng: number;
  area_km2: string | null;
  length_km: string | null;
  elevation_min_m: number | null;
  elevation_max_m: number | null;
  observations: number;
  cited_observations: number;
};

async function main() {
  await dataSource.initialize();
  try {
    const rows: Row[] = await dataSource.query(
      `
      SELECT g.name, g.rgi_id, g.source, g.lat, g.lng, g.area_km2, g.length_km,
             g.elevation_min_m, g.elevation_max_m,
             (SELECT count(*)::int FROM glacier_observations o
               WHERE o.glacier_id = g.id AND o.source = $1) AS observations,
             (SELECT count(*)::int FROM glacier_observations o
               WHERE o.glacier_id = g.id AND o.source = g.source) AS cited_observations
      FROM glaciers g
      ORDER BY g.name
    `,
      [RGI_SOURCE],
    );

    if (rows.length === 0) {
      console.error(
        'FAIL: no glaciers in the table. Run `npm run seed:glaciers` first.',
      );
      process.exit(1);
    }

    const unmatchedNames = new Set(UNMATCHED.map((g) => g.name));
    const problems: string[] = [];
    for (const r of rows) {
      const area = r.area_km2 === null ? null : Number(r.area_km2);
      const length = r.length_km === null ? null : Number(r.length_km);
      if (!r.source?.trim())
        problems.push(`${r.name}: missing source citation`);
      if (!r.rgi_id && !unmatchedNames.has(r.name)) {
        problems.push(
          `${r.name}: rgi_id is NULL and it is not a registered UNMATCHED record`,
        );
      }
      if (
        r.lat < REGION_BBOX.minLat ||
        r.lat > REGION_BBOX.maxLat ||
        r.lng < REGION_BBOX.minLng ||
        r.lng > REGION_BBOX.maxLng
      ) {
        problems.push(
          `${r.name}: (${r.lat}, ${r.lng}) is outside the Gilgit-Baltistan/Chitral envelope`,
        );
      }
      if (area !== null && !(area > 0))
        problems.push(`${r.name}: non-positive area_km2 (${area})`);
      if (r.rgi_id && area === null)
        problems.push(`${r.name}: has rgi_id but no area_km2`);
      if (length !== null && !(length > 0))
        problems.push(`${r.name}: non-positive length_km (${length})`);
      if (
        r.elevation_min_m !== null &&
        r.elevation_max_m !== null &&
        r.elevation_min_m >= r.elevation_max_m
      ) {
        problems.push(`${r.name}: elevation_min_m >= elevation_max_m`);
      }
    }

    const byRgi = new Map(
      rows.filter((r) => r.rgi_id).map((r) => [r.rgi_id, r]),
    );
    for (const g of RGI_MATCHED) {
      const r = byRgi.get(g.rgiId);
      if (!r) {
        problems.push(`${g.name}: ${g.rgiId} not in the table`);
        continue;
      }
      if (r.name !== g.name)
        problems.push(`${g.rgiId}: named "${r.name}", expected "${g.name}"`);
      if (r.source !== RGI_SOURCE)
        problems.push(`${g.name}: source is not the RGI v7.0 citation`);
      if (r.observations === 0)
        problems.push(`${g.name}: no RGI v7.0 baseline observation`);
    }

    // UNMATCHED records must carry their registered citation, and exactly the values
    // that citation states — nothing measured may appear without a source stating it.
    for (const g of UNMATCHED) {
      const matches = rows.filter((r) => r.name === g.name);
      if (matches.length !== 1) {
        problems.push(`${g.name}: expected 1 row, found ${matches.length}`);
        continue;
      }
      const [r] = matches;
      if (r.rgi_id) problems.push(`${g.name}: has rgi_id ${r.rgi_id}`);
      if (r.source !== g.source)
        problems.push(`${g.name}: source differs from the registered citation`);
      const m = g.measured;
      const expected: Record<string, number | null> = {
        area_km2: m?.areaKm2 ?? null,
        length_km: m?.lengthKm ?? null,
        elevation_min_m: m?.elevationMinM ?? null,
        elevation_max_m: m?.elevationMaxM ?? null,
      };
      const actual: Record<string, string | number | null> = {
        area_km2: r.area_km2,
        length_km: r.length_km,
        elevation_min_m: r.elevation_min_m,
        elevation_max_m: r.elevation_max_m,
      };
      for (const [field, want] of Object.entries(expected)) {
        const got = actual[field] === null ? null : Number(actual[field]);
        if (got !== want) {
          problems.push(
            `${g.name}: ${field} is ${got ?? 'NULL'}, cited value is ${want ?? 'none'}`,
          );
        }
      }
      const wantObs =
        m && (m.areaKm2 !== undefined || m.lengthKm !== undefined) ? 1 : 0;
      if (r.cited_observations !== wantObs) {
        problems.push(
          `${g.name}: ${r.cited_observations} cited observation(s), expected ${wantObs}`,
        );
      }
    }

    const withRgi = rows.filter((r) => r.rgi_id).length;
    console.log(
      `${rows.length} glacier(s) in the table: ${withRgi} with an RGI v7.0 ID, ` +
        `${rows.length - withRgi} without.`,
    );
    if (problems.length > 0) {
      console.error(`FAIL: ${problems.length} integrity problem(s):`);
      problems.forEach((p) => console.error(`  - ${p}`));
      process.exit(1);
    }
    console.log(
      'OK: every glacier is cited, inside the region, and either RGI v7.0-matched with ' +
        'real measurements or a registered unmatched record holding only cited values.',
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
