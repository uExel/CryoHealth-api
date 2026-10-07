/**
 * Idempotent glacier seed — upserts the curated register in
 * src/glaciers/data/glaciers.seed-data.ts. Safe to re-run, including in prod:
 *   npm run seed:glaciers   (then npm run verify:glaciers)
 *
 * - RGI_MATCHED records take every measured attribute from the committed RGI v7.0
 *   extract (src/glaciers/data/rgi7-region14-extract.csv) and upsert ON CONFLICT on
 *   rgi_id. A row left by the earlier name-keyed seed (same name, rgi_id NULL) is
 *   adopted first, so re-seeding an existing database updates it instead of
 *   duplicating it.
 * - Each matched glacier also gets one glacier_observations row at its RGI outline
 *   date: a single cited baseline point, not a trajectory. Nothing is interpolated.
 * - UNMATCHED records are upserted by name with rgi_id NULL and only the values their
 *   cited source states (`measured`), plus one dated observation when it gives any.
 * - Rows not in the register (admin-created, or seed-dev-data's) are never touched.
 */
import 'reflect-metadata';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { EntityManager } from 'typeorm';
import dataSource from '../src/database/data-source';
import {
  RENAMED_FROM,
  RGI_EXTRACT_FILE,
  RGI_MATCHED,
  RGI_SOURCE,
  RGI_SOURCE_URL,
  UNMATCHED,
} from '../src/glaciers/data/glaciers.seed-data';

/** RGI v7.0 `term_type` codes; 9 = not assigned → stored as NULL. */
const TERM_TYPES: Record<string, string> = {
  '0': 'land-terminating',
  '1': 'marine-terminating',
  '2': 'lake-terminating',
  '3': 'shelf-terminating',
};

type RgiRow = Record<string, string>;

function readExtract(): Map<string, RgiRow> {
  const path = join(__dirname, '../src/glaciers/data', RGI_EXTRACT_FILE);
  const [header, ...lines] = readFileSync(path, 'utf8').trim().split('\n');
  const cols = header.split(',');
  const rows = new Map<string, RgiRow>();
  for (const line of lines) {
    // The extract is plain comma-separated with no quoted fields; refuse anything else
    // rather than mis-splitting a value.
    if (line.includes('"'))
      throw new Error(`Quoted CSV not supported: ${line}`);
    const cells = line.split(',');
    if (cells.length !== cols.length) throw new Error(`Bad CSV row: ${line}`);
    const row = Object.fromEntries(cols.map((c, i) => [c, cells[i]]));
    rows.set(row.rgi_id, row);
  }
  return rows;
}

function num(row: RgiRow, col: string): number {
  const v = Number(row[col]);
  if (row[col] === '' || !Number.isFinite(v)) {
    throw new Error(`${row.rgi_id}: ${col} is not a number ("${row[col]}")`);
  }
  return v;
}

async function districtId(
  manager: EntityManager,
  name: string | undefined,
): Promise<string | null> {
  if (!name) return null;
  const rows: { id: string }[] = await manager.query(
    `SELECT id FROM districts WHERE name = $1 LIMIT 1`,
    [name],
  );
  if (!rows[0])
    console.warn(`District "${name}" not found; district_id left NULL.`);
  return rows[0]?.id ?? null;
}

async function main() {
  const extract = readExtract();
  await dataSource.initialize();
  try {
    const counts = { inserted: 0, updated: 0, observations: 0 };

    await dataSource.transaction(async (manager) => {
      for (const g of RGI_MATCHED) {
        const r = extract.get(g.rgiId);
        if (!r)
          throw new Error(
            `${g.name}: ${g.rgiId} missing from ${RGI_EXTRACT_FILE}`,
          );
        // RGI dates are UTC; an explicit Z keeps the DB session timezone out of it.
        const observedAt = `${r.src_date.slice(0, 10)}T00:00:00Z`;
        const areaKm2 = num(r, 'area_km2');
        const lengthKm = num(r, 'lmax_m') / 1000;

        const legacyNames = [g.name, RENAMED_FROM[g.name]].filter(Boolean);
        await manager.query(
          `UPDATE glaciers SET rgi_id = $1
           WHERE id = (SELECT id FROM glaciers WHERE rgi_id IS NULL AND name = ANY($2)
                       ORDER BY created_at LIMIT 1)
             AND NOT EXISTS (SELECT 1 FROM glaciers WHERE rgi_id = $1)`,
          [g.rgiId, legacyNames],
        );

        const [row]: { id: string; inserted: boolean }[] = await manager.query(
          `INSERT INTO glaciers (
             name, rgi_id, glims_id, district_id, lat, lng, area_km2, length_km,
             elevation_min_m, elevation_max_m, status, terminus_type, source,
             source_url, last_observed, notes
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
           ON CONFLICT (rgi_id) WHERE rgi_id IS NOT NULL DO UPDATE SET
             name = EXCLUDED.name,
             glims_id = EXCLUDED.glims_id,
             district_id = EXCLUDED.district_id,
             lat = EXCLUDED.lat,
             lng = EXCLUDED.lng,
             area_km2 = EXCLUDED.area_km2,
             length_km = EXCLUDED.length_km,
             elevation_min_m = EXCLUDED.elevation_min_m,
             elevation_max_m = EXCLUDED.elevation_max_m,
             status = EXCLUDED.status,
             terminus_type = EXCLUDED.terminus_type,
             source = EXCLUDED.source,
             source_url = EXCLUDED.source_url,
             last_observed = EXCLUDED.last_observed,
             notes = EXCLUDED.notes
           RETURNING id, (xmax = 0) AS inserted`,
          [
            g.name,
            g.rgiId,
            r.glims_id || null,
            await districtId(manager, g.district),
            num(r, 'cenlat'),
            num(r, 'cenlon'),
            areaKm2,
            lengthKm,
            Math.round(num(r, 'zmin_m')),
            Math.round(num(r, 'zmax_m')),
            g.status,
            TERM_TYPES[r.term_type] ?? null,
            RGI_SOURCE,
            RGI_SOURCE_URL,
            observedAt,
            g.notes,
          ],
        );
        if (row.inserted) counts.inserted++;
        else counts.updated++;

        const obs: unknown[] = await manager.query(
          `INSERT INTO glacier_observations (glacier_id, observed_at, area_km2, length_km, source, notes)
           SELECT $1, $2::timestamptz, $3, $4, $5, $6
           WHERE NOT EXISTS (
             SELECT 1 FROM glacier_observations
             WHERE glacier_id = $1 AND source = $5
           )
           RETURNING id`,
          [
            row.id,
            observedAt,
            areaKm2,
            lengthKm,
            RGI_SOURCE,
            'RGI v7.0 outline (source imagery date). Single baseline point, not a trend.',
          ],
        );
        counts.observations += obs.length;
      }

      for (const g of UNMATCHED) {
        const m = g.measured;
        const observedAt = m ? `${m.observedAt}T00:00:00Z` : null;
        const values = [
          g.name,
          await districtId(manager, g.district),
          g.lat,
          g.lng,
          g.status,
          g.source,
          g.sourceUrl ?? null,
          g.notes,
          m?.areaKm2 ?? null,
          m?.lengthKm ?? null,
          m?.elevationMinM ?? null,
          m?.elevationMaxM ?? null,
          observedAt,
        ];
        // TypeORM's postgres driver returns [rows, rowCount] for UPDATE ... RETURNING.
        const [updated]: [{ id: string }[], number] = await manager.query(
          `UPDATE glaciers SET
             district_id = $2, lat = $3, lng = $4, status = $5, source = $6,
             source_url = $7, notes = $8, rgi_id = NULL, glims_id = NULL,
             area_km2 = $9, length_km = $10, elevation_min_m = $11,
             elevation_max_m = $12, terminus_type = NULL, last_observed = $13
           WHERE id = (SELECT id FROM glaciers WHERE name = $1 AND rgi_id IS NULL
                       ORDER BY created_at LIMIT 1)
           RETURNING id`,
          values,
        );
        let id = updated[0]?.id;
        if (id) {
          counts.updated++;
        } else {
          const [row]: { id: string }[] = await manager.query(
            `INSERT INTO glaciers (
               name, district_id, lat, lng, status, source, source_url, notes,
               area_km2, length_km, elevation_min_m, elevation_max_m, last_observed
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
             RETURNING id`,
            values,
          );
          id = row.id;
          counts.inserted++;
        }

        if (m && (m.areaKm2 !== undefined || m.lengthKm !== undefined)) {
          const obs: unknown[] = await manager.query(
            `INSERT INTO glacier_observations (glacier_id, observed_at, area_km2, length_km, source, notes)
             SELECT $1, $2::timestamptz, $3, $4, $5, $6
             WHERE NOT EXISTS (
               SELECT 1 FROM glacier_observations WHERE glacier_id = $1 AND source = $5
             )
             RETURNING id`,
            [
              id,
              observedAt,
              m.areaKm2 ?? null,
              m.lengthKm ?? null,
              g.source,
              'Published value from the cited source. Single dated point, not a trend.',
            ],
          );
          counts.observations += obs.length;
        }
      }
    });

    console.log(
      `glaciers: ${counts.inserted} inserted, ${counts.updated} updated ` +
        `(${RGI_MATCHED.length} RGI v7.0-matched, ${UNMATCHED.length} unmatched); ` +
        `${counts.observations} cited observation(s) added`,
    );
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
