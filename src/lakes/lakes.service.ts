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
import { AuditEntry } from '../alerts/entities/audit-entry.entity';

const MAX_PAGE = 100;
const ADMIN_LIMIT = 200;
const HAZARD_SCORES_LIMIT = 120;

export interface HotLakeRow {
  id: string;
  name: string;
  current_tier: string;
  current_risk_score: number | null;
  downstream_population: number | null;
  last_updated: Date;
}

export interface LakeRow {
  id: string;
  slug: string;
  name: string;
  nameUr: string | null;
  valley: string;
  district: string;
  district_id: string | null;
  damType: string;
  glacierContact: boolean;
  icimodId: string | null;
  elevationM: number | null;
  historicalGlof: boolean;
  currentTier: string;
  stale: boolean;
  currentRiskScore: number | null;
  downstreamPopulation: number | null;
  areaKm2: number | null;
  lat: number | null;
  lng: number | null;
  district_name: string | null;
  elevation_m: number | null;
}

export interface HistoryRow {
  score: number;
  tier: string;
  confidence: number | null;
  observed_at: Date;
}

export interface AlertRow {
  id: string;
  title: string;
  tier: string;
  created_at: Date;
  estimated_window: string | null;
}

export interface GlacierRow {
  id: string;
  name: string;
  rgi_id: string | null;
  glims_id: string | null;
  district_id: string | null;
  lat: number | null;
  lng: number | null;
  area_km2: number | null;
  length_km: number | null;
  elevation_min_m: number | null;
  elevation_max_m: number | null;
  status: string;
  terminus_type: string | null;
  source: string | null;
  last_observed: Date | null;
  notes: string | null;
  district_name: string | null;
}

export interface HazardScoreRow {
  run_id: string;
  score: number;
  tier: string;
  components: unknown;
  computed_at: Date;
}

export interface CountRow {
  count: number;
}

export interface LakeAdminRow {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
  current_tier: string;
  current_risk_score: number | null;
  downstream_population: number | null;
  last_updated: Date;
  district_id: string | null;
}

export interface DistrictRow {
  name: string;
}

export interface InsertResultRow {
  id: string;
}

export interface LakeUpdateRow {
  name: string;
  nameUr: string | null;
  valley: string;
  district_id: string | null;
  damType: string;
  glacierContact: boolean;
  icimodId: string | null;
  elevationM: number | null;
  historicalGlof: boolean;
  source: string;
  sourceUrl: string | null;
  downstream_population: number;
  area_km2: number | null;
  lat: number | null;
  lng: number | null;
}

export interface DepsCountRow {
  n: number;
}

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

  async list(page = 1, pageSize = 50) {
    const take = Math.min(pageSize, MAX_PAGE);
    const [items, total] = await this.lakes.findAndCount({
      order: { name: 'ASC' },
      skip: (page - 1) * take,
      take,
    });
    return { items, total, page, pageSize: take };
  }

  async listHotLakes(): Promise<HotLakeRow[]> {
    return await this.dataSource.query(
      `SELECT id, name, upper("currentTier"::text) AS current_tier, current_risk_score, downstream_population, "updatedAt" AS last_updated FROM lakes WHERE "currentTier" IN ('high', 'critical') ORDER BY current_risk_score DESC NULLS LAST`,
    );
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

  async lakeDetail(id: string) {
    const lakeRows = await this.dataSource.query(
      `SELECT l.*, ST_Y(l.geom::geometry) AS lat, ST_X(l.geom::geometry) AS lng, upper(l."currentTier"::text) AS current_tier, l."elevationM" AS elevation_m, d.name AS district_name FROM lakes l LEFT JOIN districts d ON d.id = l.district_id WHERE l.id = $1 LIMIT 1`,
      [id],
    );
    const history = await this.dataSource.query(
      `SELECT score, upper(tier) AS tier, confidence, observed_at FROM lake_risk_scores WHERE lake_id = $1 ORDER BY observed_at ASC LIMIT 120`,
      [id],
    );
    const alerts = await this.dataSource.query(
      `SELECT id, title, upper(tier::text) AS tier, "createdAt" AS created_at, estimated_window FROM alerts WHERE "lakeId" = $1 ORDER BY "createdAt" DESC LIMIT 10`,
      [id],
    );
    const glaciers = await this.dataSource.query(
      `SELECT g.id, g.name, g.rgi_id, g.glims_id, g.district_id, g.lat, g.lng, g.area_km2, g.length_km, g.elevation_min_m, g.elevation_max_m, g.status, g.terminus_type, g.source, g.last_observed, g.notes, d.name AS district_name FROM glaciers g LEFT JOIN districts d ON d.id = g.district_id ORDER BY g.area_km2 DESC NULLS LAST`,
    );

    const lake = lakeRows[0] ?? null;
    if (!lake) throw new NotFoundException('Lake not found');
    return { lake, history, alerts, glaciers };
  }

  async listHazardScores(lakeId: string) {
    const [rows, countRows] = await Promise.all([
      this.dataSource.query(
        `SELECT "runId" AS run_id, score, upper(tier::text) AS tier, components, "computedAt" AS computed_at FROM hazard_scores WHERE "lakeId" = $1 ORDER BY "computedAt" DESC LIMIT $2`,
        [lakeId, HAZARD_SCORES_LIMIT],
      ),
      this.dataSource.query(
        `SELECT count(*)::int AS count FROM hazard_scores WHERE "lakeId" = $1`,
        [lakeId],
      ),
    ]);
    const typedRows = rows as HazardScoreRow[];
    const typedCount = countRows as CountRow[];
    const total = typedCount[0]?.count ?? 0;
    return {
      hazardScores: typedRows,
      total,
      hasMore: total > typedRows.length,
    };
  }

  async listAdmin() {
    const [rows, countRows] = await Promise.all([
      this.dataSource.query(
        `SELECT l.id, l.name, ST_Y(l.geom::geometry) AS lat, ST_X(l.geom::geometry) AS lng, upper(l."currentTier"::text) AS current_tier, l.current_risk_score, l.downstream_population, l."updatedAt" AS last_updated, l.district_id FROM lakes l ORDER BY l.current_risk_score DESC NULLS LAST LIMIT $1`,
        [ADMIN_LIMIT],
      ),
      this.dataSource.query(`SELECT count(*)::int AS count FROM lakes`),
    ]);
    const typedRows = rows as LakeAdminRow[];
    const typedCount = countRows as CountRow[];
    const total = typedCount[0]?.count ?? 0;
    return { rows: typedRows, total, hasMore: total > typedRows.length };
  }

  async createLake(dto: Record<string, unknown>, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
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
        `INSERT INTO lakes (name, "nameUr", valley, district, district_id, "damType", "glacierContact", "icimodId", "elevationM", "historicalGlof", source, "sourceUrl", downstream_population, area_km2, slug, geom) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, ST_SetSRID(ST_MakePoint($16, $17), 4326)) RETURNING id`,
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

  async updateLake(id: string, dto: Record<string, unknown>, actorId: string) {
    return this.dataSource.transaction(async (manager) => {
      const beforeRows = await manager.query(
        `SELECT name, "nameUr", valley, district_id, "damType", "glacierContact", "icimodId", "elevationM", "historicalGlof", source, "sourceUrl", downstream_population, area_km2, ST_Y(geom::geometry) AS lat, ST_X(geom::geometry) AS lng FROM lakes WHERE id = $1`,
        [id],
      );
      if (!beforeRows[0]) {
        throw new NotFoundException('Lake not found');
      }
      const before = beforeRows[0];

      const WRITABLE_COLUMNS = [
        'name',
        'nameUr',
        'valley',
        'district_id',
        'damType',
        'glacierContact',
        'icimodId',
        'elevationM',
        'historicalGlof',
        'source',
        'sourceUrl',
        'downstream_population',
        'area_km2',
      ];

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
      const setValues: unknown[] = [];
      let paramIndex = 1;

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

      const { lat, lng } = dto;
      if (lat !== undefined || lng !== undefined) {
        const newLng = lng ?? before.lng;
        const newLat = lat ?? before.lat;
        setParts.push(
          `geom = ST_SetSRID(ST_MakePoint($${paramIndex++}, $${paramIndex++}), 4326)`,
        );
        setValues.push(newLng, newLat);
      }

      setParts.push(`"updatedAt" = now()`);

      setValues.push(id);
      const whereParam = paramIndex++;

      const updateRows = await manager.query(
        `UPDATE lakes SET ${setParts.join(', ')} WHERE id = $${whereParam} RETURNING name, "nameUr", valley, district_id, "damType", "glacierContact", "icimodId", "elevationM", "historicalGlof", source, "sourceUrl", downstream_population, area_km2, ST_Y(geom::geometry) AS lat, ST_X(geom::geometry) AS lng`,
        setValues,
      );
      const after = updateRows[0];

      const changed: Record<string, { from: unknown; to: unknown }> = {};
      for (const key of Object.keys(dto)) {
        const beforeVal = before[key as keyof LakeUpdateRow];
        const afterVal = after[key as keyof LakeUpdateRow];
        if (beforeVal !== undefined && beforeVal !== afterVal) {
          changed[key] = { from: beforeVal, to: afterVal };
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
      const deps = await Promise.all([
        await manager.query(
          `SELECT count(*)::int AS n FROM observations WHERE "lakeId" = $1`,
          [id],
        ),
        await manager.query(
          `SELECT count(*)::int AS n FROM hazard_scores WHERE "lakeId" = $1`,
          [id],
        ),
        await manager.query(
          `SELECT count(*)::int AS n FROM lake_risk_scores WHERE lake_id = $1`,
          [id],
        ),
        await manager.query(
          `SELECT count(*)::int AS n FROM alerts WHERE "lakeId" = $1`,
          [id],
        ),
        await manager.query(
          `SELECT count(*)::int AS n FROM facilities WHERE "lakeId" = $1`,
          [id],
        ),
      ]);

      const typedDeps = [deps[0], deps[1], deps[2], deps[3], deps[4]];
      const dependents = {
        observations: typedDeps[0][0].n,
        hazard_scores: typedDeps[1][0].n,
        lake_risk_scores: typedDeps[2][0].n,
        alerts: typedDeps[3][0].n,
        facilities: typedDeps[4][0].n,
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
