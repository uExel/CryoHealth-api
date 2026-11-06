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

/** `exposure.method` CryoHealth-geo writes when the population was summed along the
 *  D8 downstream flow path (anything else is the radial-buffer fallback or an old row). */
const FLOW_PATH_METHOD = 'd8_flowline_corridor';

/**
 * lakes.current_risk_score and lakes.downstream_population are NOT NULL DEFAULT 0
 * and nothing keeps them up to date, so a 0 there means "no data", not "no risk".
 * These two fragments give the real value or NULL instead. `alias` is the lakes table
 * alias used in the query.
 */
const latestScoreSql = (alias: string) =>
  `(SELECT h.score FROM hazard_scores h WHERE h."lakeId" = ${alias}.id ORDER BY h."computedAt" DESC LIMIT 1)`;
/**
 * A curated figure on the lake row wins when there is one; otherwise the flow-path
 * population from the newest hazard score, but only when that score was really
 * flow-routed (a radial-buffer fallback is an estimate and is never shown as the
 * downstream population). NULL when neither exists.
 */
const knownPopulationSql = (alias: string) =>
  `COALESCE(NULLIF(${alias}.downstream_population, 0), (SELECT CASE WHEN fp.components->'exposure'->>'method' = '${FLOW_PATH_METHOD}' THEN ROUND((fp.components->'exposure'->>'population_along_corridor')::numeric)::int END FROM hazard_scores fp WHERE fp."lakeId" = ${alias}.id ORDER BY fp."computedAt" DESC LIMIT 1))`;

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

/** The `exposure` block the geo service stores in HazardScore.components. */
export interface ExposureComponent {
  source?: string;
  buffer_km?: number;
  buffer_shape?: string;
  population_within_buffer?: number;
  note?: string;
  /** 'd8_flowline_corridor' (flow-routed) or 'radial_buffer_fallback'; absent on old rows. */
  method?: string;
  population_along_corridor?: number;
  corridor_km?: number;
  corridor_half_width_m?: number;
  max_km?: number;
  outlet_lon?: number;
  outlet_lat?: number;
  /** DEM elevation at the flowline's start cell; a peak or ridge here means a bad outlet. */
  start_elevation_m?: number;
}

/** The `confidence` block the geo service stores in HazardScore.components: a heuristic
 *  data-quality number (input coverage x observation freshness), not a statistical
 *  confidence. Absent on scores computed before it existed. */
export interface ConfidenceComponent {
  value?: number;
  method?: string;
  input_coverage?: number;
  freshness?: number;
  latest_observation_age_days?: number | null;
  note?: string;
}

export interface LatestScoreRow {
  lakeId: string;
  score: string;
  tier: string;
  computedAt: Date;
  exposure: ExposureComponent | null;
  confidence: ConfidenceComponent | null;
  rawInputs: RawInputs | null;
  weights: Record<string, number> | null;
}

/** The `raw_inputs` block the geo service stores in HazardScore.components. */
export interface RawInputs {
  growth_30d_pct?: number | null;
  growth_90d_pct?: number | null;
  seasonal_anomaly_pct?: number | null;
  dam_type?: string | null;
}

export interface LatestAreaRow {
  lakeId: string;
  areaKm2: string;
  capturedAt: Date;
}

export interface CurrentScore {
  score: number;
  tier: string;
  computedAt: Date;
}

export interface CurrentArea {
  areaKm2: number;
  capturedAt: Date;
}

/** WorldPop people summed along the D8 downstream flow path from the lake outlet (a
 *  1 km wide corridor, up to max_km). Computed by CryoHealth-geo; not a census count and
 *  not validated against a historical flood footprint (see geo's HAZARD_METHODOLOGY). */
export interface DownstreamPopulationFlowPath {
  count: number;
  method: typeof FLOW_PATH_METHOD;
  corridorKm: number | null;
  corridorHalfWidthM: number | null;
  maxKm: number | null;
  /** DEM elevation (m) where the flowline starts; a very high value means the outlet
   *  point is not at a lake and the figure should not be trusted. */
  startElevationM: number | null;
  source: string | null;
  note: string;
  computedAt: Date;
}

/** Where `downstreamPopulation` came from: a figure an admin entered on the lake
 *  ('curated') or the flow-path computation ('d8_flowline_corridor'). */
export type DownstreamPopulationSource = 'curated' | typeof FLOW_PATH_METHOD;

/** Heuristic data-quality number for the newest score, see ConfidenceComponent. */
export interface ScoreConfidenceDetail {
  method: string | null;
  inputCoverage: number | null;
  freshness: number | null;
  latestObservationAgeDays: number | null;
  note: string | null;
}

/** A rough WorldPop figure, not a validated downstream population. Only given when the
 *  score was NOT flow-routed (radial-buffer fallback or an older row). See
 *  downstreamPopulation / downstreamPopulationFlowPath for the flow-routed number. */
export interface DownstreamPopulationEstimate {
  count: number;
  bufferKm: number | null;
  bufferShape: string | null;
  source: string | null;
  note: string;
  computedAt: Date;
}

/**
 * Share (0..1) of the score's weighted signals that had real data behind them. Geo
 * scores a missing signal as zero risk, so a low value means the score leans on gaps.
 * It is input coverage, not a statistical confidence. area_growth is half 30-day and
 * half 90-day; a dam type of "unknown" counts as no data. Null when the stored score
 * has no raw inputs or weights (older rows).
 */
export function inputCoverage(
  raw: RawInputs | null | undefined,
  weights: Record<string, number> | null | undefined,
): number | null {
  if (!raw || !weights) return null;
  const has = (v: unknown) => typeof v === 'number';
  const present: Record<string, number> = {
    area_growth:
      ((has(raw.growth_30d_pct) ? 1 : 0) + (has(raw.growth_90d_pct) ? 1 : 0)) /
      2,
    seasonal_anomaly: has(raw.seasonal_anomaly_pct) ? 1 : 0,
    dam_type: raw.dam_type && raw.dam_type !== 'unknown' ? 1 : 0,
    // static inputs geo always reads from the lake row
    glacier_contact: 1,
    slope: 1,
    historical_glof: 1,
  };
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (total <= 0) return null;
  const covered = Object.entries(weights).reduce(
    (sum, [k, w]) => sum + w * (present[k] ?? 0),
    0,
  );
  return Math.round((covered / total) * 100) / 100;
}

const ESTIMATE_NOTE =
  'Rough estimate: WorldPop people within a straight-line square buffer of the lake, not flow-path routed.';
const FALLBACK_ESTIMATE_NOTE =
  'Rough estimate: WorldPop people within a straight-line square buffer of the lake. Flow-path routing failed for this score, so this is not flow-path routed.';
const FLOW_PATH_NOTE =
  'WorldPop people along the modelled downstream flow path from the lake outlet (D8 on the Copernicus GLO-30 DEM, 1 km wide corridor). A model estimate, not a census count, and not validated against a historical flood footprint.';

const isNum = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

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
    const [lakes, total] = await this.lakes.findAndCount({
      order: { name: 'ASC' },
      skip: (page - 1) * take,
      take,
    });
    const items = await this.withLatestReadings(lakes);
    return { items, total, page, pageSize: take };
  }

  /**
   * Adds currentScore, currentArea, downstreamPopulation (+ its source and the flow-path
   * detail), downstreamPopulationEstimate, confidence (+ detail) and inputCoverage to
   * each lake. They come from the newest HazardScore and Observation rows, so those
   * tables stay the single source of truth. A lake with no score, scene or exposure yet
   * gets null, never a made-up value.
   */
  private async withLatestReadings(lakes: Lake[]) {
    if (lakes.length === 0) return [];
    const ids = lakes.map((l) => l.id);
    const [scoreRows, areaRows] = await Promise.all([
      this.dataSource.query(
        `SELECT DISTINCT ON ("lakeId") "lakeId", score, tier, "computedAt", components->'exposure' AS exposure, components->'confidence' AS confidence, components->'raw_inputs' AS "rawInputs", components->'weights' AS weights FROM hazard_scores WHERE "lakeId" = ANY($1) ORDER BY "lakeId", "computedAt" DESC`,
        [ids],
      ) as Promise<LatestScoreRow[]>,
      this.dataSource.query(
        `SELECT DISTINCT ON ("lakeId") "lakeId", "areaKm2", "capturedAt" FROM observations WHERE "lakeId" = ANY($1) ORDER BY "lakeId", "capturedAt" DESC`,
        [ids],
      ) as Promise<LatestAreaRow[]>,
    ]);
    const scores = new Map(scoreRows.map((r) => [r.lakeId, r]));
    const areas = new Map(areaRows.map((r) => [r.lakeId, r]));

    return lakes.map((lake) => {
      const s = scores.get(lake.id);
      const a = areas.get(lake.id);
      const currentScore: CurrentScore | null = s
        ? { score: Number(s.score), tier: s.tier, computedAt: s.computedAt }
        : null;
      const currentArea: CurrentArea | null = a
        ? { areaKm2: Number(a.areaKm2), capturedAt: a.capturedAt }
        : null;
      const exposure = s?.exposure ?? null;
      // Flow-routed only when geo says so AND gives the number; a radial-buffer fallback
      // or an old row (no `method`) is an estimate and never the downstream population.
      const flowCount = exposure?.population_along_corridor;
      const downstreamPopulationFlowPath: DownstreamPopulationFlowPath | null =
        s && exposure?.method === FLOW_PATH_METHOD && isNum(flowCount)
          ? {
              count: Math.round(flowCount),
              method: FLOW_PATH_METHOD,
              corridorKm: exposure.corridor_km ?? null,
              corridorHalfWidthM: exposure.corridor_half_width_m ?? null,
              maxKm: exposure.max_km ?? null,
              startElevationM: exposure.start_elevation_m ?? null,
              source: exposure.source ?? null,
              note: FLOW_PATH_NOTE,
              computedAt: s.computedAt,
            }
          : null;
      const bufferCount = exposure?.population_within_buffer;
      const downstreamPopulationEstimate: DownstreamPopulationEstimate | null =
        s &&
        !downstreamPopulationFlowPath &&
        exposure?.method !== FLOW_PATH_METHOD &&
        isNum(bufferCount)
          ? {
              count: bufferCount,
              bufferKm: exposure?.buffer_km ?? null,
              bufferShape: exposure?.buffer_shape ?? null,
              source: exposure?.source ?? null,
              note:
                exposure?.method === 'radial_buffer_fallback'
                  ? FALLBACK_ESTIMATE_NOTE
                  : ESTIMATE_NOTE,
              computedAt: s.computedAt,
            }
          : null;
      // A figure an admin entered on the lake wins; otherwise the flow-path number.
      const curated = lake.downstreamPopulation || null;
      const downstreamPopulationSource: DownstreamPopulationSource | null =
        curated !== null
          ? 'curated'
          : downstreamPopulationFlowPath
            ? FLOW_PATH_METHOD
            : null;
      const conf = s?.confidence ?? null;
      const confidence = conf && isNum(conf.value) ? conf.value : null;
      const confidenceDetail: ScoreConfidenceDetail | null =
        confidence !== null && conf
          ? {
              method: conf.method ?? null,
              inputCoverage: conf.input_coverage ?? null,
              freshness: conf.freshness ?? null,
              latestObservationAgeDays:
                conf.latest_observation_age_days ?? null,
              note: conf.note ?? null,
            }
          : null;
      return {
        ...lake,
        currentScore,
        currentArea,
        downstreamPopulationFlowPath,
        downstreamPopulationEstimate,
        confidence,
        confidenceDetail,
        inputCoverage: s ? inputCoverage(s.rawInputs, s.weights) : null,
        currentRiskScore: currentScore?.score ?? null,
        downstreamPopulation:
          curated ?? downstreamPopulationFlowPath?.count ?? null,
        downstreamPopulationSource,
      };
    });
  }

  async listHotLakes(): Promise<HotLakeRow[]> {
    return await this.dataSource.query(
      `SELECT l.id, l.name, upper(l."currentTier"::text) AS current_tier, ${latestScoreSql('l')} AS current_risk_score, ${knownPopulationSql('l')} AS downstream_population, l."updatedAt" AS last_updated FROM lakes l WHERE l."currentTier" IN ('high', 'critical') ORDER BY current_risk_score DESC NULLS LAST`,
    );
  }

  async byId(id: string) {
    const lake = await this.lakes.findOne({ where: { id } });
    if (!lake) throw new NotFoundException('No such lake');
    const [withReadings] = await this.withLatestReadings([lake]);
    return withReadings;
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
      `SELECT l.*, ${latestScoreSql('l')} AS current_risk_score, ${knownPopulationSql('l')} AS downstream_population, ST_Y(l.geom::geometry) AS lat, ST_X(l.geom::geometry) AS lng, upper(l."currentTier"::text) AS current_tier, l."elevationM" AS elevation_m, d.name AS district_name FROM lakes l LEFT JOIN districts d ON d.id = l.district_id WHERE l.id = $1 LIMIT 1`,
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
        `SELECT l.id, l.name, ST_Y(l.geom::geometry) AS lat, ST_X(l.geom::geometry) AS lng, upper(l."currentTier"::text) AS current_tier, ${latestScoreSql('l')} AS current_risk_score, ${knownPopulationSql('l')} AS downstream_population, l."updatedAt" AS last_updated, l.district_id FROM lakes l ORDER BY current_risk_score DESC NULLS LAST LIMIT $1`,
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
          dto.downstream_population ?? null,
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
