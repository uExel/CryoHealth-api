import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Lake } from './entities/lake.entity';
import { Observation } from './entities/observation.entity';
import { LakesService } from './lakes.service';

/** Flow-path downstream population and per-score confidence on /lakes (issue #13). Both
 *  come from the newest hazard score's `components`, written by CryoHealth-geo. */
describe('LakesService flow-path population and confidence', () => {
  const lakesRepo = { findAndCount: jest.fn(), findOne: jest.fn() };
  const obsRepo = { findAndCount: jest.fn() };
  const dataSource = { query: jest.fn(), transaction: jest.fn() };
  let service: LakesService;
  const computedAt = new Date('2026-11-06T00:00:00Z');

  beforeEach(async () => {
    jest.resetAllMocks();
    const mod = await Test.createTestingModule({
      providers: [
        LakesService,
        { provide: getRepositoryToken(Lake), useValue: lakesRepo },
        { provide: getRepositoryToken(Observation), useValue: obsRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = mod.get(LakesService);
  });

  const flowExposure = {
    source: 'worldpop_pak_2025_constrained_100m',
    method: 'd8_flowline_corridor',
    corridor_km: 41.37,
    corridor_half_width_m: 500,
    max_km: 50,
    outlet_lon: 74.552,
    outlet_lat: 36.421,
    population_along_corridor: 18432.4,
    // geo keeps this alias for old readers; it must not be shown as a square-buffer estimate
    population_within_buffer: 18432.4,
  };

  /** One lake, with the given newest score row (or none). */
  const listOne = async (
    lake: Record<string, unknown>,
    score: Record<string, unknown> | null,
  ) => {
    lakesRepo.findAndCount.mockResolvedValue([[lake], 1]);
    dataSource.query
      .mockResolvedValueOnce(
        score
          ? [
              {
                lakeId: 'lake-1',
                score: '0.5',
                tier: 'watch',
                computedAt,
                ...score,
              },
            ]
          : [],
      )
      .mockResolvedValueOnce([]);
    const { items } = await service.list();
    return items[0];
  };

  describe('downstream population', () => {
    it('uses the flow-routed count as downstreamPopulation and says where it came from', async () => {
      const lake = await listOne(
        { id: 'lake-1', downstreamPopulation: null },
        { exposure: flowExposure },
      );

      expect(lake.downstreamPopulation).toBe(18432);
      expect(lake.downstreamPopulationSource).toBe('d8_flowline_corridor');
      expect(lake.downstreamPopulationFlowPath).toEqual({
        count: 18432,
        method: 'd8_flowline_corridor',
        corridorKm: 41.37,
        corridorHalfWidthM: 500,
        maxKm: 50,
        source: 'worldpop_pak_2025_constrained_100m',
        note: expect.stringContaining('not a census count'),
        computedAt,
      });
    });

    it('does not show the flow-routed figure as a square-buffer estimate too', async () => {
      const lake = await listOne(
        { id: 'lake-1', downstreamPopulation: null },
        { exposure: flowExposure },
      );

      expect(lake.downstreamPopulationEstimate).toBeNull();
    });

    it('keeps a figure an admin entered on the lake, and still returns the flow-path detail', async () => {
      const lake = await listOne(
        { id: 'lake-1', downstreamPopulation: 25000 },
        { exposure: flowExposure },
      );

      expect(lake.downstreamPopulation).toBe(25000);
      expect(lake.downstreamPopulationSource).toBe('curated');
      expect(lake.downstreamPopulationFlowPath?.count).toBe(18432);
    });

    it('never presents a radial-buffer fallback as the downstream population', async () => {
      const lake = await listOne(
        { id: 'lake-1', downstreamPopulation: null },
        {
          exposure: {
            source: 'worldpop_pak_2025_constrained_100m',
            method: 'radial_buffer_fallback',
            buffer_km: 5,
            buffer_shape: 'square',
            population_within_buffer: 900,
          },
        },
      );

      expect(lake.downstreamPopulation).toBeNull();
      expect(lake.downstreamPopulationSource).toBeNull();
      expect(lake.downstreamPopulationFlowPath).toBeNull();
      expect(lake.downstreamPopulationEstimate).toEqual({
        count: 900,
        bufferKm: 5,
        bufferShape: 'square',
        source: 'worldpop_pak_2025_constrained_100m',
        note: expect.stringContaining('Flow-path routing failed'),
        computedAt,
      });
    });

    it('keeps the old square-buffer estimate for a score from before the method field existed', async () => {
      const lake = await listOne(
        { id: 'lake-1', downstreamPopulation: null },
        {
          exposure: {
            buffer_km: 5,
            buffer_shape: 'square',
            population_within_buffer: 1234.5,
          },
        },
      );

      expect(lake.downstreamPopulation).toBeNull();
      expect(lake.downstreamPopulationFlowPath).toBeNull();
      expect(lake.downstreamPopulationEstimate?.count).toBe(1234.5);
      expect(lake.downstreamPopulationEstimate?.note).toContain(
        'not flow-path routed',
      );
    });

    it('returns null, not 0, when the flow-path method has no usable number', async () => {
      const lake = await listOne(
        { id: 'lake-1', downstreamPopulation: null },
        {
          exposure: {
            method: 'd8_flowline_corridor',
            population_within_buffer: 55,
          },
        },
      );

      expect(lake.downstreamPopulation).toBeNull();
      expect(lake.downstreamPopulationFlowPath).toBeNull();
      expect(lake.downstreamPopulationEstimate).toBeNull();
    });

    it('is null for a lake with no score at all', async () => {
      const lake = await listOne(
        { id: 'lake-1', downstreamPopulation: null },
        null,
      );

      expect(lake.downstreamPopulation).toBeNull();
      expect(lake.downstreamPopulationSource).toBeNull();
      expect(lake.downstreamPopulationFlowPath).toBeNull();
    });

    it('hot-lakes and the admin list fall back to the flow-routed count only for flow-routed scores', async () => {
      dataSource.query.mockResolvedValue([]);

      await service.listHotLakes();
      await service.listAdmin();

      const sql = dataSource.query.mock.calls
        .map((c) => String(c[0]))
        .filter((q) => q.includes('FROM lakes l'));
      expect(sql).toHaveLength(2);
      for (const q of sql) {
        // curated figure first, then the newest score's corridor count, only if flow-routed
        expect(q).toContain('COALESCE(NULLIF(l.downstream_population, 0)');
        expect(q).toContain(
          "components->'exposure'->>'method' = 'd8_flowline_corridor'",
        );
        expect(q).toContain("'population_along_corridor'");
        expect(q).toContain('ORDER BY fp."computedAt" DESC LIMIT 1');
      }
    });
  });

  describe('confidence', () => {
    const confidence = {
      value: 0.62,
      method: 'input_coverage_x_freshness_v1',
      input_coverage: 0.7,
      freshness: 0.89,
      latest_observation_age_days: 24,
      note: 'Heuristic data-quality score, not a statistical confidence.',
    };

    it("returns the geo service's per-score confidence with its factors", async () => {
      const lake = await listOne({ id: 'lake-1' }, { confidence });

      expect(lake.confidence).toBe(0.62);
      expect(lake.confidenceDetail).toEqual({
        method: 'input_coverage_x_freshness_v1',
        inputCoverage: 0.7,
        freshness: 0.89,
        latestObservationAgeDays: 24,
        note: 'Heuristic data-quality score, not a statistical confidence.',
      });
    });

    it('keeps a real confidence of 0 as 0 (a stale score), not null', async () => {
      const lake = await listOne(
        { id: 'lake-1' },
        { confidence: { ...confidence, value: 0 } },
      );

      expect(lake.confidence).toBe(0);
    });

    it('is null, never an invented number, for a score computed before confidence existed', async () => {
      const lake = await listOne({ id: 'lake-1' }, { confidence: null });

      expect(lake.confidence).toBeNull();
      expect(lake.confidenceDetail).toBeNull();
    });

    it('is null when the stored value is not a number', async () => {
      const lake = await listOne(
        { id: 'lake-1' },
        { confidence: { ...confidence, value: 'high' } },
      );

      expect(lake.confidence).toBeNull();
      expect(lake.confidenceDetail).toBeNull();
    });

    it('is null for a lake with no score at all', async () => {
      const lake = await listOne({ id: 'lake-1' }, null);

      expect(lake.confidence).toBeNull();
    });

    it('asks the database for the confidence block of the newest score', async () => {
      await listOne({ id: 'lake-1' }, null);

      expect(String(dataSource.query.mock.calls[0][0])).toContain(
        "components->'confidence' AS confidence",
      );
    });
  });
});
