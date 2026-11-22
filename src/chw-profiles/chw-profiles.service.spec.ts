import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditEntry } from '../alerts/entities/audit-entry.entity';
import { District } from '../districts/entities/district.entity';
import { ChwProfile } from './entities/chw-profile.entity';
import { ChwProfilesService } from './chw-profiles.service';

describe('ChwProfilesService.update (phone)', () => {
  type AuditRow = {
    action: string;
    meta: { meta: { changed: Record<string, unknown> } | null };
  };
  const profileRepo = {
    findOne: jest.fn(),
    save: jest.fn<Promise<ChwProfile>, [ChwProfile]>(),
  };
  const auditRepo = { insert: jest.fn<Promise<void>, [AuditRow]>() };
  const manager = {
    getRepository: (entity: unknown) =>
      entity === AuditEntry ? auditRepo : profileRepo,
  };
  const dataSource = {
    transaction: (fn: (m: typeof manager) => unknown) => fn(manager),
  };
  let service: ChwProfilesService;

  const stored = (): ChwProfile =>
    ({
      id: 'p1',
      fullName: 'Amina',
      districtId: 'd1',
      phone: '0300-1112223',
      language: 'ur',
      createdAt: new Date('2026-08-01T00:00:00Z'),
    }) as ChwProfile;

  beforeEach(async () => {
    jest.resetAllMocks();
    profileRepo.findOne.mockResolvedValue(stored());
    // Like TypeORM: save() persists only the properties that are not undefined,
    // so the returned entity is what was written.
    profileRepo.save.mockImplementation((p: ChwProfile) => Promise.resolve(p));
    const mod = await Test.createTestingModule({
      providers: [
        ChwProfilesService,
        { provide: getRepositoryToken(ChwProfile), useValue: {} },
        { provide: getRepositoryToken(District), useValue: {} },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = mod.get(ChwProfilesService);
  });

  const savedPhone = () => profileRepo.save.mock.calls[0][0].phone;

  it('leaves the phone untouched when it is not in the payload', async () => {
    const out = await service.update('p1', { full_name: 'Amina K' }, 'admin');
    expect(savedPhone()).toBe('0300-1112223');
    expect(out.phone).toBe('0300-1112223');
  });

  it.each([
    ['null', null],
    ['an empty string', ''],
    ['whitespace only', '   '],
  ])('clears the phone to null when it is %s', async (_label, phone) => {
    const out = await service.update('p1', { phone }, 'admin');
    // null, not undefined: TypeORM skips undefined, which would keep the old value.
    expect(savedPhone()).toBeNull();
    expect(out.phone).toBeNull();
  });

  it('sets a new phone value as given', async () => {
    const out = await service.update('p1', { phone: '0345-0000000' }, 'admin');
    expect(savedPhone()).toBe('0345-0000000');
    expect(out.phone).toBe('0345-0000000');
  });

  it('records the cleared phone in the audit entry, and nothing else changed', async () => {
    await service.update('p1', { phone: null }, 'admin');
    expect(auditRepo.insert).toHaveBeenCalledTimes(1);
    const row = auditRepo.insert.mock.calls[0][0];
    expect(row.action).toBe('chw_profile.update');
    expect(row.meta.meta?.changed).toEqual({
      phone: { from: '0300-1112223', to: null },
    });
  });

  it('writes no audit change when an already-empty phone is cleared again', async () => {
    profileRepo.findOne.mockResolvedValue({ ...stored(), phone: null });
    await service.update('p1', { phone: '' }, 'admin');
    expect(auditRepo.insert.mock.calls[0][0].meta.meta).toBeNull();
  });
});
