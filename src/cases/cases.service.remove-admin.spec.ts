import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditEntry } from '../alerts/entities/audit-entry.entity';
import { CasesService } from './cases.service';
import { ChwCase } from './entities/chw-case.entity';

const CASE_ID = '11111111-1111-4111-8111-111111111111';
const ACTOR = '22222222-2222-4222-8222-222222222222';

/** The soft-delete and its audit row must share one transaction: the UPDATE has to go
 *  through the transaction's manager, never through dataSource.query (another
 *  connection, which would commit the delete even if the audit insert then fails). */
describe('CasesService.removeAdmin', () => {
  const auditInsert = jest.fn();
  const manager = {
    query: jest.fn(),
    getRepository: jest.fn((entity: unknown) => {
      if (entity === AuditEntry) return { insert: auditInsert };
      throw new Error('unexpected repository');
    }),
  };
  const dataSource = {
    query: jest.fn(),
    // Like TypeORM: run the callback with the transaction's manager.
    transaction: jest.fn((cb: (m: typeof manager) => unknown) => cb(manager)),
  };
  let service: CasesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CasesService,
        { provide: getRepositoryToken(ChwCase), useValue: {} },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = moduleRef.get(CasesService);
  });

  it('soft-deletes through the transaction manager and writes one audit row', async () => {
    manager.query.mockResolvedValue([{ id: CASE_ID }]);
    auditInsert.mockResolvedValue(undefined);

    const result = await service.removeAdmin(CASE_ID, 'duplicate entry', ACTOR);

    expect(result).toEqual({ id: CASE_ID });
    expect(manager.query).toHaveBeenCalledTimes(1);
    expect(manager.query.mock.calls[0][0]).toContain(
      'UPDATE cases SET deleted_at',
    );
    expect(manager.query.mock.calls[0][1]).toEqual([CASE_ID]);
    expect(dataSource.query).not.toHaveBeenCalled();
    expect(auditInsert).toHaveBeenCalledTimes(1);
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: ACTOR,
        action: 'case.delete',
        entityType: 'Case',
        entityId: CASE_ID,
        reason: 'duplicate entry',
      }),
    );
  });

  it('rejects when the audit insert fails, so the transaction can roll the delete back', async () => {
    manager.query.mockResolvedValue([{ id: CASE_ID }]);
    auditInsert.mockRejectedValue(new Error('audit insert failed'));

    await expect(service.removeAdmin(CASE_ID, 'why', ACTOR)).rejects.toThrow(
      'audit insert failed',
    );
    // The delete ran inside the transaction (manager), not on a separate connection.
    expect(manager.query).toHaveBeenCalledTimes(1);
    expect(dataSource.query).not.toHaveBeenCalled();
  });

  it('returns 404 and writes no audit row when the case is missing or already deleted', async () => {
    manager.query.mockResolvedValue([]);

    await expect(service.removeAdmin(CASE_ID, 'why', ACTOR)).rejects.toThrow(
      NotFoundException,
    );
    expect(auditInsert).not.toHaveBeenCalled();
    expect(dataSource.query).not.toHaveBeenCalled();
  });
});
