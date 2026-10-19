import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { District } from './entities/district.entity';
import { AuditEntry } from '../alerts/entities/audit-entry.entity';
import { DistrictsService } from './districts.service';

describe('DistrictsService.remove', () => {
  const calls: string[] = [];
  let district: { id: string; name: string } | null;
  let counts: Record<string, number>;

  const districtRepo = {
    createQueryBuilder: jest.fn(),
    remove: jest.fn(),
  };
  const auditRepo = { insert: jest.fn() };
  const manager = {
    getRepository: (entity: unknown) =>
      entity === AuditEntry ? auditRepo : districtRepo,
    query: jest.fn(),
  };
  let service: DistrictsService;

  beforeEach(async () => {
    calls.length = 0;
    district = { id: 'd-1', name: 'Ghizer' };
    counts = {};
    jest.clearAllMocks();

    districtRepo.createQueryBuilder.mockImplementation(() => {
      const qb = {
        setLock: jest.fn((mode: string) => {
          calls.push(`lock:${mode}`);
          return qb;
        }),
        where: jest.fn(() => qb),
        getOne: jest.fn(() => Promise.resolve(district)),
      };
      return qb;
    });
    districtRepo.remove.mockImplementation(() => {
      calls.push('delete');
      return Promise.resolve();
    });
    manager.query.mockImplementation((sql: string) => {
      const table = /FROM "(\w+)"/.exec(sql)?.[1] ?? '';
      calls.push(`count:${table}`);
      return Promise.resolve([{ n: counts[table] ?? 0 }]);
    });

    const mod = await Test.createTestingModule({
      providers: [
        DistrictsService,
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
    service = mod.get(DistrictsService);
  });

  it('locks the district row before counting dependents and deleting', async () => {
    await service.remove('d-1', 'cleanup', 'actor-1');

    expect(calls[0]).toBe('lock:pessimistic_write');
    expect(calls.indexOf('lock:pessimistic_write')).toBeLessThan(
      calls.findIndex((c) => c.startsWith('count:')),
    );
    expect(calls.indexOf('delete')).toBeGreaterThan(
      calls.lastIndexOf('count:lakes'),
    );
  });

  it('counts every table that references districts', async () => {
    await service.remove('d-1', 'cleanup', 'actor-1');

    expect(calls.filter((c) => c.startsWith('count:')).sort()).toEqual([
      'count:alerts',
      'count:cases',
      'count:chw_profiles',
      'count:glaciers',
      'count:lakes',
    ]);
  });

  it('deletes a district with no dependents and writes an audit entry', async () => {
    await expect(service.remove('d-1', 'cleanup', 'actor-1')).resolves.toEqual({
      success: true,
    });
    expect(districtRepo.remove).toHaveBeenCalledWith(district);
    expect(auditRepo.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'district.delete',
        entityId: 'd-1',
        actorId: 'actor-1',
      }),
    );
  });

  it('refuses to delete a district that still has dependents', async () => {
    counts = { lakes: 2, alerts: 1 };

    const err: unknown = await service
      .remove('d-1', 'cleanup', 'actor-1')
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(ConflictException);
    expect((err as ConflictException).getResponse()).toEqual(
      expect.objectContaining({
        dependents: {
          alerts: 1,
          cases: 0,
          chw_profiles: 0,
          glaciers: 0,
          lakes: 2,
        },
      }),
    );
    expect(districtRepo.remove).not.toHaveBeenCalled();
    expect(auditRepo.insert).not.toHaveBeenCalled();
  });

  it('returns 404 and counts nothing when the district does not exist', async () => {
    district = null;

    await expect(service.remove('missing', 'x', 'actor-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(manager.query).not.toHaveBeenCalled();
    expect(districtRepo.remove).not.toHaveBeenCalled();
  });
});
