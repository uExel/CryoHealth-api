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

  it('lake detail alerts expose status and cleared_at so cleared alerts can be told apart', async () => {
    const alertRow = {
      id: 'a-1',
      title: 'Cleared',
      tier: 'HIGH',
      status: 'cleared',
      cleared_at: '2026-10-01T00:00:00.000Z',
    };
    dataSource.query
      .mockResolvedValueOnce([{ id: 'lake-1' }]) // lake
      .mockResolvedValueOnce([]) // history
      .mockResolvedValueOnce([alertRow]) // alerts
      .mockResolvedValueOnce([]); // glaciers
    const detail = await service.lakeDetail('lake-1');
    const alertsSql = dataSource.query.mock.calls[2][0] as string;
    expect(alertsSql).toContain('FROM alerts');
    expect(alertsSql).toContain('status');
    expect(alertsSql).toContain('"clearedAt" AS cleared_at');
    expect(detail.alerts).toEqual([alertRow]);
  });
});
