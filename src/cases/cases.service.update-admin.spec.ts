import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditEntry } from '../alerts/entities/audit-entry.entity';
import { CasesService } from './cases.service';
import { ChwCase } from './entities/chw-case.entity';

const CASE_ID = '11111111-1111-4111-8111-111111111111';
const ACTOR = '22222222-2222-4222-8222-222222222222';

const BEFORE = { id: CASE_ID, diagnosis: 'cough', outcome: null };
const AFTER = { id: CASE_ID, diagnosis: 'pneumonia', outcome: null };

/** manager.query() hands back plain rows for a SELECT but [rows, rowCount] for an
 *  UPDATE ... RETURNING. These tests mock both shapes as TypeORM really returns them. */
describe('CasesService.updateAdmin', () => {
  const auditInsert = jest.fn();
  const manager = {
    query: jest.fn(),
    getRepository: jest.fn((entity: unknown) => {
      if (entity === AuditEntry) return { insert: auditInsert };
      throw new Error('unexpected repository');
    }),
  };
  const dataSource = {
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

  it('returns the updated row itself and writes one audit row', async () => {
    manager.query
      .mockResolvedValueOnce([BEFORE])
      .mockResolvedValueOnce([[AFTER], 1]);
    auditInsert.mockResolvedValue(undefined);

    const result = await service.updateAdmin(
      CASE_ID,
      { diagnosis: 'pneumonia' },
      ACTOR,
    );

    expect(result).toEqual(AFTER);
    expect(auditInsert).toHaveBeenCalledTimes(1);
    expect(auditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'case.update',
        entityId: CASE_ID,
        actorId: ACTOR,
      }),
    );
  });

  it('returns 404 and writes no audit row when the case is missing or already deleted', async () => {
    manager.query.mockResolvedValueOnce([]);

    await expect(
      service.updateAdmin(CASE_ID, { diagnosis: 'x' }, ACTOR),
    ).rejects.toThrow(NotFoundException);
    expect(auditInsert).not.toHaveBeenCalled();
  });

  it('returns 404 and writes no audit row when the case is deleted between the read and the update', async () => {
    manager.query
      .mockResolvedValueOnce([BEFORE])
      .mockResolvedValueOnce([[], 0]);

    await expect(
      service.updateAdmin(CASE_ID, { diagnosis: 'x' }, ACTOR),
    ).rejects.toThrow(NotFoundException);
    expect(auditInsert).not.toHaveBeenCalled();
  });
});
