import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Lake } from './entities/lake.entity';
import { Observation } from './entities/observation.entity';
import { District } from '../districts/entities/district.entity';
import { AuditEntry } from '../alerts/entities/audit-entry.entity';

const MAX_PAGE = 100;
const ADMIN_LIMIT = 200;
const HAZARD_SCORES_LIMIT = 120;

@Injectable()
export class LakesService {
  constructor(
    @InjectRepository(Lake) private readonly lakes: Repository<Lake>,
    @InjectRepository(Observation)
    private readonly observationRepo: Repository<Observation>,
    private readonly dataSource: DataSource,
  ) {}

  private async audit(
    manager: EntityManager,
    actorId: string,
    action: string,
    entityId: string,
    reason?: string,
    meta?: Record<string, unknown>,
  ) {
    await manager.getRepository(AuditEntry).insert({
      actorId,
      action,
      entityType: 'Lake',
      entityId,
      reason,
      meta,
    } as any);
  }

  /* ------------------------------------------------------------------ */
  /*  Public read endpoints                                              */
  /* ------------------------------------------------------------------ */

  /** Paginated lake list (public API). */
  async list(page = 1, pageSize = 50) {
    const take = Math.min(pageSize, MAX_PAGE);
    const [items, total] = await this.lakes.findAndCount({
      order: { name: 'ASC' },
      skip: (page - 1) * take,
      take,
    });
    return { items, total, page, pageSize: take };
  }

  async listHotLakes() {
    return this.dataSource.query(`
      SELECT id, name, upper("currentTier"::text) AS current_tier, current_risk_score, downstream_population, "updatedAt" AS last_updated
      FROM lakes
      WHERE "currentTier" IN ('high', 'critical')
      ORDER BY current_risk_score DESC NULLS LAST
    `);
  }

  async byId(id: string) {
    const lake = await this.lakes.findOne({ where: { id } });
    if (!lake) throw new NotFoundException('No such lake');
    return lake;
  }

  async listObservations(lakeId: string, page = 1, pageSize = 100) {
    const take = Math.min(pageSize, 500);
    const [items, total] = await this.observationRepo.findAndCount({
      where: { lakeId },
      order: { capturedAt: 'DESC' },
      skip: (page - 1) * take,
      take,
    });
    return { items, total, page, pageSize: take };
  }

  /* ------------------------------------------------------------------ */
  /*  Lake detail (joined) — public                                     */
  /* ------------------------------------------------------------------ */

  async lakeDetail(id: string) {
    const [lakeRows, history, alerts, glaciers] = await Promise.all([
      this.dataSource.query(
        `SELECT l.*, ST_Y(l.geom::geometry) AS lat, ST_X(l.geom::geometry) AS lng,
                upper(l."currentTier"::text) AS current_tier, l."elevationM" AS elevation_m,
                d.name AS district_name
         FROM lakes l
         LEFT JOIN districts d ON d.id = l.district_id
         WHERE l.id = $1
         LIMIT 1`,
        [id],
      ),
      this.dataSource.query(
        `SELECT score, upper(tier) AS tier, confidence, observed_at
         FROM lake_risk_scores
         WHERE lake_id = $1
         ORDER BY observed_at ASC
         LIMIT 120`,
        [id],
      ),
      this.dataSource.query(
        `SELECT id, title, upper(tier::text) AS tier, "createdAt" AS created_at, estimated_window
         FROM alerts
         WHERE "lakeId" = $1
         ORDER BY "createdAt" DESC
         LIMIT 10`,
        [id],
      ),
      this.dataSource.query(
        `SELECT g.id, g.name, g.rgi_id, g.glims_id, g.district_id, g.lat, g.lng, g.area_km2, g.length_km,
                g.elevation_min_m, g.elevation_max_m, g.status, g.terminus_type, g.source,
                g.last_observed, g.notes,
                d.name AS district_name
         FROM glaciers g
         LEFT JOIN districts d ON d.id = g.district_id
         ORDER BY g.area_km2 DESC NULLS LAST`,
      ),
    ]);

    const lake = lakeRows[0] ?? null;
    if (!lake) throw new NotFoundException('Lake not found');

    return { lake, history, alerts, glaciers };
  }

  /* ------------------------------------------------------------------ */
  /*  Hazard scores (admin, auth required)                              */
  /* ------------------------------------------------------------------ */

  async listHazardScores(lakeId: string) {
    const [rows, countRows] = await Promise.all([
      this.dataSource.query(
        `SELECT "runId" AS run_id, score, upper(tier::text) AS tier,
                components, "computedAt" AS computed_at
         FROM hazard_scores
         WHERE "lakeId" = $1
         ORDER BY "computedAt" DESC
         LIMIT $2`,
        [lakeId, HAZARD_SCORES_LIMIT],
      ),
      this.dataSource.query(
        `SELECT count(*)::int AS count FROM hazard_scores WHERE "lakeId" = $1`,
        [lakeId],
      ),
    ]);
    const total = countRows[0]?.count ?? 0;
    return { hazardScores: rows, total, hasMore: total > rows.length };
  }

  /* ------------------------------------------------------------------ */
  /*  Admin list                                                         */
  /* ------------------------------------------------------------------ */

  async listAdmin() {
    const [rows, countRows] = await Promise.all([
      this.dataSource.query(
        `SELECT l.id, l.name, ST_Y(l.geom::geometry) AS lat, ST_X(l.geom::geometry) AS lng,
                upper(l."currentTier"::text) AS current_tier, l.current_risk_score, l.downstream_population,
                l."updatedAt" AS last_updated, l.district_id
         FROM lakes l
         ORDER BY l.current_risk_score DESC NULLS LAST
         LIMIT $1`,
        [ADMIN_LIMIT],
      ),
      this.dataSource.query(
        `SELECT count(*)::int AS count FROM lakes`,
      ),
    ]);
    const total = countRows[0]?.count ?? 0;
    return { rows, total, hasMore: total > rows.length };
  }

  /* ------------------------------------------------------------------ */
  /*  Admin CRUD                                                         */
  /* ------------------------------------------------------------------ */

  async createLake(dto: any, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      // Derive district name from district_id
      const districtRows = await manager.query(
        `SELECT name FROM districts WHERE id = $1`,
        [dto.district_id],
      );
      if (!districtRows[0]) {
        throw new BadRequestException(
          'district_id does not reference an existing district',
        );
      }
      const districtName = districtRows[0].name;

      const insertResult = await manager.query(
        `INSERT INTO lakes (
           name, "nameUr", valley, district, district_id, "damType", "glacierContact",
           "icimodId", "elevationM", "historicalGlof", source, "sourceUrl",
           downstream_population, area_km2, slug, geom
         )
         VALUES (
           $1, $2, $3, $4, $5, $6, $7,
           $8, $9, $10, $11, $12,
           $13, $14, $15, ST_SetSRID(ST_MakePoint($16, $17), 4326)
         )
         RETURNING id`,
        [
          dto.name,
          dto.nameUr ?? null,
          dto.valley,
          districtName,
          dto.district_id,
          dto.damType ?? 'unknown',
          dto.glacierContact ?? false,
          dto.icimodId ?? null,
          dto.elevationM ?? null,
          dto.historicalGlof ?? false,
          dto.source,
          dto.sourceUrl ?? null,
          dto.downstream_population ?? 0,
          dto.area_km2 ?? null,
          dto.slug,
          dto.lng,
          dto.lat,
        ],
      );
      const lake = insertResult[0];

      await this.audit(manager, actorId, 'lake.create', lake.id, undefined, {
        created: { name: dto.name, slug: dto.slug, source: dto.source },
      });

      return { lake: { id: lake.id } };
    });
  }

  async updateLake(id: string, dto: any, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      // Read current state
      const beforeRows = await manager.query(
        `SELECT name, "nameUr", valley, district_id, "damType", "glacierContact", "icimodId",
                "elevationM", "historicalGlof", source, "sourceUrl", downstream_population, area_km2,
                ST_Y(geom::geometry) AS lat, ST_X(geom::geometry) AS lng
         FROM lakes WHERE id = $1`,
        [id],
      );
      if (!beforeRows[0]) {
        throw new NotFoundException('Lake not found');
      }
      const before = beforeRows[0];

      // Build SET clause dynamically
      const WRITABLE_COLUMNS = [
        'name', 'nameUr', 'valley', 'district_id', 'damType', 'glacierContact',
        'icimodId', 'elevationM', 'historicalGlof', 'source', 'sourceUrl',
        'downstream_population', 'area_km2',
      ];

      // Column name mapping for quoted identifiers
      const quotedCol: Record<string, string> = {
        nameUr: '"nameUr"',
        damType: '"damType"',
        glacierContact: '"glacierContact"',
        icimodId: '"icimodId"',
        elevationM: '"elevationM"',
        historicalGlof: '"historicalGlof"',
        sourceUrl: '"sourceUrl"',
      };

      const setParts: string[] = [];
      const setValues: any[] = [];
      let paramIndex = 1;

      // If district_id is changing, also update the text column
      if (dto.district_id !== undefined) {
        const districtRows = await manager.query(
          `SELECT name FROM districts WHERE id = $1`,
          [dto.district_id],
        );
        if (!districtRows[0]) {
          throw new BadRequestException(
            'district_id does not reference an existing district',
          );
        }
        setParts.push(`district = $${paramIndex++}`);
        setValues.push(districtRows[0].name);
      }

      for (const col of WRITABLE_COLUMNS) {
        if (dto[col] !== undefined) {
          const colName = quotedCol[col] || col;
          setParts.push(`${colName} = $${paramIndex++}`);
          setValues.push(dto[col]);
        }
      }

      // Handle lat/lng => geom update
      const { lat, lng } = dto;
      if (lat !== undefined || lng !== undefined) {
        const newLng = lng ?? before.lng;
        const newLat = lat ?? before.lat;
        setParts.push(`geom = ST_SetSRID(ST_MakePoint($${paramIndex++}, $${paramIndex++}), 4326)`);
        setValues.push(newLng, newLat);
      }

      // Always update updatedAt
      setParts.push(`"updatedAt" = now()`);

      if (setParts.length === 1) {
        // Only updatedAt — effectively a no-op, but still valid
      }

      setValues.push(id);
      const whereParam = paramIndex++;

      const updateRows = await manager.query(
        `UPDATE lakes SET ${setParts.join(', ')}
         WHERE id = $${whereParam}
         RETURNING name, "nameUr", valley, district_id, "damType", "glacierContact", "icimodId",
                   "elevationM", "historicalGlof", source, "sourceUrl", downstream_population, area_km2,
                   ST_Y(geom::geometry) AS lat, ST_X(geom::geometry) AS lng`,
        setValues,
      );
      const after = updateRows[0];

      // Build changed diff
      const changed: Record<string, { from: any; to: any }> = {};
      for (const key of Object.keys(dto)) {
        if (before[key] !== undefined && before[key] !== after[key]) {
          changed[key] = { from: before[key], to: after[key] };
        }
      }

      await this.audit(manager, actorId, 'lake.update', id, undefined, {
        changed: Object.keys(changed).length ? changed : null,
      });

      return { lake: after };
    });
  }

  async deleteLake(id: string, reason: string, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      // Check dependents
      const deps = await Promise.all([
        manager.query(`SELECT count(*)::int AS n FROM observations WHERE "lakeId" = $1`, [id]),
        manager.query(`SELECT count(*)::int AS n FROM hazard_scores WHERE "lakeId" = $1`, [id]),
        manager.query(`SELECT count(*)::int AS n FROM lake_risk_scores WHERE lake_id = $1`, [id]),
        manager.query(`SELECT count(*)::int AS n FROM alerts WHERE "lakeId" = $1`, [id]),
        manager.query(`SELECT count(*)::int AS n FROM facilities WHERE "lakeId" = $1`, [id]),
      ]);

      const dependents = {
        observations: deps[0][0].n,
        hazard_scores: deps[1][0].n,
        lake_risk_scores: deps[2][0].n,
        alerts: deps[3][0].n,
        facilities: deps[4][0].n,
      };

      if (Object.values(dependents).some((n: number) => n > 0)) {
        throw new ConflictException({
          error: 'Cannot delete: dependent rows exist',
          dependents,
        });
      }

      const rows = await manager.query(
        `DELETE FROM lakes WHERE id = $1 RETURNING id`,
        [id],
      );
      if (!rows[0]) throw new NotFoundException('Lake not found');

      await this.audit(manager, actorId, 'lake.delete', id, reason);

      return { ok: true };
    });
  }
}
