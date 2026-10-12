import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Glacier } from './entities/glacier.entity';
import { GlacierObservation } from './entities/glacier-observation.entity';
import { District } from '../districts/entities/district.entity';
import { AuditEntry } from '../alerts/entities/audit-entry.entity';
import { GlaciersService } from './glaciers.service';

describe('GlaciersService.remove', () => {
  const calls: string[] = [];
  let glacier: { id: string; name: string } | null;
  let observationCount: number;

  const glacierRepo = {
    createQueryBuilder: jest.fn(),
    remove: jest.fn(),
  };
  const obsRepo = { count: jest.fn() };
  const auditRepo = { insert: jest.fn() };
  const manager = {
    getRepository: (entity: unknown) => {
      if (entity === AuditEntry) return auditRepo;
      if (entity === GlacierObservation) return obsRepo;
      return glacierRepo;
    },
  };
  let service: GlaciersService;

  beforeEach(async () => {
    calls.length = 0;
    glacier = { id: 'g-1', name: 'Batura Glacier' };
    observationCount = 0;
    jest.clearAllMocks();

    glacierRepo.createQueryBuilder.mockImplementation(() => {
      const qb = {
        setLock: jest.fn((mode: string) => {
          calls.push(`lock:${mode}`);
          return qb;
        }),
        where: jest.fn(() => qb),
        getOne: jest.fn(() => Promise.resolve(glacier)),
      };
      return qb;
    });
    obsRepo.count.mockImplementation(() => {
      calls.push('count');
      return Promise.resolve(observationCount);
    });
    glacierRepo.remove.mockImplementation(() => {
      calls.push('delete');
      return Promise.resolve();
    });

    const mod = await Test.createTestingModule({
      providers: [
        GlaciersService,
        { provide: getRepositoryToken(Glacier), useValue: {} },
        { provide: getRepositoryToken(GlacierObservation), useValue: {} },
        { provide: getRepositoryToken(District), useValue: {} },
        {
          provide: DataSource,
          useValue: {
            transaction: (cb: (m: unknown) => unknown) =>
              Promise.resolve(cb(manager)),
          },
        },
      ],
    }).compile();
    service = mod.get(GlaciersService);
  });

  it('locks the glacier row, then counts observations, then deletes', async () => {
    await service.remove('g-1', 'cleanup', 'actor-1');

    expect(calls).toEqual(['lock:pessimistic_write', 'count', 'delete']);
  });

  it('refuses to delete a glacier that has observations (they would be cascade-deleted)', async () => {
    observationCount = 3;

    const err: unknown = await service
      .remove('g-1', 'cleanup', 'actor-1')
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ConflictException);
    expect((err as ConflictException).getResponse()).toEqual(
      expect.objectContaining({ dependents: { glacier_observations: 3 } }),
    );
    expect(glacierRepo.remove).not.toHaveBeenCalled();
  });

  it('deletes a glacier with no observations and writes an audit entry', async () => {
    await expect(service.remove('g-1', 'cleanup', 'actor-1')).resolves.toEqual({
      id: 'g-1',
    });
    expect(auditRepo.insert).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'glacier.delete', entityId: 'g-1' }),
    );
  });

  it('returns 404 when the glacier does not exist', async () => {
    glacier = null;

    await expect(service.remove('missing', 'x', 'actor-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(obsRepo.count).not.toHaveBeenCalled();
  });
});
