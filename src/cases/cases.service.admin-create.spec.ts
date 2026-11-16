import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { AuditEntry } from '../alerts/entities/audit-entry.entity';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';
import { ChwCase } from './entities/chw-case.entity';

describe('CasesService.createAdmin', () => {
  const auditRepo = { insert: jest.fn() };
  const manager = {
    getRepository: (entity: unknown) =>
      entity === AuditEntry ? auditRepo : {},
    query: jest.fn(),
  };
  let chwExists: boolean;
  let districtExists: boolean;
  let service: CasesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    chwExists = true;
    districtExists = true;
    manager.query.mockImplementation((sql: string) => {
      if (sql.includes('FROM users')) {
        return Promise.resolve(chwExists ? [{ id: 'chw-1' }] : []);
      }
      if (sql.includes('FROM districts')) {
        return Promise.resolve(districtExists ? [{ id: 'd-1' }] : []);
      }
      if (sql.includes('INSERT INTO cases')) {
        return Promise.resolve([{ id: 'case-1', chw_id: 'chw-1' }]);
      }
      return Promise.resolve([]);
    });

    const mod = await Test.createTestingModule({
      providers: [
        CasesService,
        { provide: getRepositoryToken(ChwCase), useValue: {} },
        {
          provide: DataSource,
          useValue: {
            transaction: (cb: (m: unknown) => unknown) =>
              Promise.resolve(cb(manager)),
          },
        },
      ],
    }).compile();
    service = mod.get(CasesService);
  });

  const insertCall = () =>
    manager.query.mock.calls.find(([sql]: [string]) =>
      sql.includes('INSERT INTO cases'),
    ) as [string, unknown[]] | undefined;

  it('inserts the case, fills the optional fields with null/false, and returns { case }', async () => {
    const result = await service.createAdmin(
      { chw_id: 'chw-1', symptoms: 'fever 3 days' },
      'admin-1',
    );

    expect(result).toEqual({ case: { id: 'case-1', chw_id: 'chw-1' } });
    expect(insertCall()?.[1]).toEqual([
      'chw-1',
      null,
      null,
      null,
      'fever 3 days',
      null,
      null,
      null,
      false,
    ]);
  });

  it('passes every provided field through', async () => {
    await service.createAdmin(
      {
        chw_id: 'chw-1',
        district_id: 'd-1',
        patient_age: 4,
        patient_sex: 'F',
        symptoms: 'cough',
        diagnosis: 'pneumonia',
        treatment: 'amoxicillin',
        outcome: 'referred',
        is_disaster_related: true,
      },
      'admin-1',
    );

    expect(insertCall()?.[1]).toEqual([
      'chw-1',
      'd-1',
      4,
      'F',
      'cough',
      'pneumonia',
      'amoxicillin',
      'referred',
      true,
    ]);
  });

  it('writes an audit row with ids only, not the clinical text', async () => {
    await service.createAdmin(
      { chw_id: 'chw-1', district_id: 'd-1', symptoms: 'secret symptoms' },
      'admin-1',
    );

    const row = auditRepo.insert.mock.calls[0][0] as Record<string, unknown>;
    expect(row).toEqual(
      expect.objectContaining({
        actorId: 'admin-1',
        action: 'case.create',
        entityType: 'Case',
        entityId: 'case-1',
      }),
    );
    expect(JSON.stringify(row)).not.toContain('secret symptoms');
  });

  it('rejects a chw_id that is not an existing CHW, and inserts nothing', async () => {
    chwExists = false;

    await expect(
      service.createAdmin({ chw_id: 'nobody', symptoms: 'x' }, 'admin-1'),
    ).rejects.toThrow(BadRequestException);
    expect(insertCall()).toBeUndefined();
    expect(auditRepo.insert).not.toHaveBeenCalled();
  });

  it('rejects a district_id that does not exist, and inserts nothing', async () => {
    districtExists = false;

    await expect(
      service.createAdmin(
        { chw_id: 'chw-1', district_id: 'missing', symptoms: 'x' },
        'admin-1',
      ),
    ).rejects.toThrow(BadRequestException);
    expect(insertCall()).toBeUndefined();
  });

  it('does not look up a district when none is given', async () => {
    await service.createAdmin({ chw_id: 'chw-1', symptoms: 'x' }, 'admin-1');

    expect(
      manager.query.mock.calls.some(([sql]: [string]) =>
        sql.includes('FROM districts'),
      ),
    ).toBe(false);
  });
});

describe('CasesController.createAdmin', () => {
  it('is limited to cryohealth_admin', () => {
    const handler = Object.getOwnPropertyDescriptor(
      CasesController.prototype,
      'createAdmin',
    )?.value as object;

    expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([
      'cryohealth_admin',
    ]);
  });
});
