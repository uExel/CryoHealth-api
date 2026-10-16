import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Lake } from './entities/lake.entity';
import { Observation } from './entities/observation.entity';
import { LakesService } from './lakes.service';

describe('LakesService', () => {
  const lakesRepo = { findAndCount: jest.fn(), findOne: jest.fn() };
  const obsRepo = { findAndCount: jest.fn() };
  const dataSource = { query: jest.fn(), transaction: jest.fn() };
  let service: LakesService;

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

  it('caps pageSize so no request is unbounded', async () => {
    lakesRepo.findAndCount.mockResolvedValue([[], 0]);
    await service.list(1, 10_000);
    expect(lakesRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 }),
    );
  });

  it('404s an unknown lake id', async () => {
    lakesRepo.findOne.mockResolvedValue(null);
    await expect(
      service.byId('7c9e2b4a-1f6d-4a8e-9b3c-5e0d8a2f7b1c'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('caps observation pageSize at 500 and orders newest first', async () => {
    obsRepo.findAndCount.mockResolvedValue([[], 0]);
    await service.listObservations('lake-1', 1, 10_000);
    expect(obsRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { lakeId: 'lake-1' },
        order: { capturedAt: 'DESC' },
        take: 500,
      }),
    );
  });

  describe('current score and area', () => {
    const scored = { id: 'lake-1', name: 'Shishper' };
    const unscored = { id: 'lake-2', name: 'Passu' };

    it('adds the newest score and scene area to each lake', async () => {
      lakesRepo.findAndCount.mockResolvedValue([[scored, unscored], 2]);
      const computedAt = new Date('2026-09-01T00:00:00Z');
      const capturedAt = new Date('2026-08-30T00:00:00Z');
      dataSource.query
        .mockResolvedValueOnce([
          { lakeId: 'lake-1', score: '0.7250', tier: 'high', computedAt },
        ])
        .mockResolvedValueOnce([
          { lakeId: 'lake-1', areaKm2: '1.250000', capturedAt },
        ]);

      const { items } = await service.list();

      expect(items[0].currentScore).toEqual({
        score: 0.725,
        tier: 'high',
        computedAt,
      });
      expect(items[0].currentArea).toEqual({ areaKm2: 1.25, capturedAt });
    });

    it('returns null, not zero, for a lake with no score or scene yet', async () => {
      lakesRepo.findAndCount.mockResolvedValue([[scored, unscored], 2]);
      dataSource.query
        .mockResolvedValueOnce([
          {
            lakeId: 'lake-1',
            score: '0.5',
            tier: 'watch',
            computedAt: new Date(),
          },
        ])
        .mockResolvedValueOnce([]);

      const { items } = await service.list();

      expect(items[1].currentScore).toBeNull();
      expect(items[1].currentArea).toBeNull();
    });

    it('adds the same fields on a single lake', async () => {
      lakesRepo.findOne.mockResolvedValue(unscored);
      dataSource.query.mockResolvedValue([]);

      const lake = await service.byId('lake-2');

      expect(lake.currentScore).toBeNull();
      expect(lake.currentArea).toBeNull();
    });

    it('does not query the database for an empty page', async () => {
      lakesRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.list();
      expect(dataSource.query).not.toHaveBeenCalled();
    });
  });

  describe('placeholder zeros', () => {
    it('reports risk score and population as null when nothing real is known', async () => {
      lakesRepo.findAndCount.mockResolvedValue([
        [{ id: 'lake-1', currentRiskScore: 0, downstreamPopulation: 0 }],
        1,
      ]);
      dataSource.query.mockResolvedValue([]);

      const { items } = await service.list();

      expect(items[0].currentRiskScore).toBeNull();
      expect(items[0].downstreamPopulation).toBeNull();
    });

    it('uses the latest hazard score as the risk score and keeps a real population', async () => {
      lakesRepo.findAndCount.mockResolvedValue([
        [{ id: 'lake-1', currentRiskScore: 0, downstreamPopulation: 1200 }],
        1,
      ]);
      dataSource.query
        .mockResolvedValueOnce([
          {
            lakeId: 'lake-1',
            score: '0.81',
            tier: 'high',
            computedAt: new Date(),
          },
        ])
        .mockResolvedValueOnce([]);

      const { items } = await service.list();

      expect(items[0].currentRiskScore).toBe(0.81);
      expect(items[0].downstreamPopulation).toBe(1200);
    });

    it('hot-lakes and the admin list read the latest score, not the stored column', async () => {
      dataSource.query.mockResolvedValue([]);

      await service.listHotLakes();
      await service.listAdmin();

      const sql = dataSource.query.mock.calls.map((c) => String(c[0]));
      const scored = sql.filter((q) => q.includes('FROM lakes l'));
      expect(scored).toHaveLength(2);
      for (const q of scored) {
        expect(q).toContain('FROM hazard_scores h');
        expect(q).toContain('NULLIF(l.downstream_population, 0)');
      }
    });
  });

  describe('creating a lake without a population figure', () => {
    const baseDto = {
      name: 'Test Lake',
      valley: 'Hunza',
      district_id: 'district-1',
      source: 'ICIMOD',
      slug: 'test-lake',
      lat: 36.1,
      lng: 74.8,
    };

    /** Runs createLake against a fake transaction and returns the INSERT's params. */
    async function createAndGetInsertParams(dto: Record<string, unknown>) {
      const manager = {
        query: jest
          .fn()
          .mockResolvedValueOnce([{ name: 'Gilgit' }])
          .mockResolvedValueOnce([{ id: 'lake-new' }]),
        getRepository: jest.fn().mockReturnValue({ insert: jest.fn() }),
      };
      dataSource.transaction.mockImplementation((cb: (m: unknown) => unknown) =>
        cb(manager),
      );
      await service.createLake(dto, 'actor-1');
      const insertCall = manager.query.mock.calls.find((c) =>
        String(c[0]).startsWith('INSERT INTO lakes'),
      );
      return insertCall![1] as unknown[];
    }

    // $13 in the INSERT is downstream_population (index 12 in the params array).
    it('stores null, not 0, when no population is given', async () => {
      const params = await createAndGetInsertParams(baseDto);
      expect(params[12]).toBeNull();
    });

    it('keeps a population figure that was given', async () => {
      const params = await createAndGetInsertParams({
        ...baseDto,
        downstream_population: 4500,
      });
      expect(params[12]).toBe(4500);
    });
  });
});
