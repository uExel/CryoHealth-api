import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditEntry } from '../alerts/entities/audit-entry.entity';
import { District } from '../districts/entities/district.entity';
import { ChwProfile } from './entities/chw-profile.entity';
import { ChwProfilesService } from './chw-profiles.service';

describe('ChwProfilesService', () => {
  type AuditRow = {
    action: string;
    meta: { meta: { changed: Record<string, unknown> } | null };
  };
  const profileRepo = {
    findOne: jest.fn(),
    save: jest.fn<Promise<ChwProfile>, [ChwProfile]>(),
    create: jest.fn<ChwProfile, [Partial<ChwProfile>]>(),
  };
  // The injected (non-transactional) repository, used by the list endpoints.
  const listQb = {
    leftJoinAndSelect: jest.fn(),
    orderBy: jest.fn(),
    take: jest.fn(),
    getMany: jest.fn(),
  };
  const listRepo = { createQueryBuilder: jest.fn(), count: jest.fn() };
  const districtRepo = { findOne: jest.fn() };
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
    profileRepo.create.mockImplementation(
      (p) => ({ id: 'new', ...p }) as ChwProfile,
    );
    districtRepo.findOne.mockResolvedValue({ id: 'd2' });
    for (const fn of [listQb.leftJoinAndSelect, listQb.orderBy, listQb.take]) {
      fn.mockReturnValue(listQb);
    }
    listQb.getMany.mockResolvedValue([]);
    listRepo.createQueryBuilder.mockReturnValue(listQb);
    listRepo.count.mockResolvedValue(0);
    const mod = await Test.createTestingModule({
      providers: [
        ChwProfilesService,
        { provide: getRepositoryToken(ChwProfile), useValue: listRepo },
        { provide: getRepositoryToken(District), useValue: districtRepo },
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

  it.each([
    ['sets a clean number as given', '0345-0000000', '0345-0000000'],
    ['trims a non-empty phone', '  0345-0000000 ', '0345-0000000'],
  ])('update %s', async (_label, input, expected) => {
    const out = await service.update('p1', { phone: input }, 'admin');
    expect(savedPhone()).toBe(expected);
    expect(out.phone).toBe(expected);
  });

  it('create trims the phone and stores no blank phone', async () => {
    await service.create(
      { full_name: 'Amina', language: 'ur', phone: '  0345-0000000 ' },
      'admin',
    );
    expect(profileRepo.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ phone: '0345-0000000' }),
    );
    await service.create(
      { full_name: 'Amina', language: 'ur', phone: '   ' },
      'admin',
    );
    expect(profileRepo.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ phone: undefined }),
    );
  });

  describe('district_id', () => {
    const savedDistrict = () => profileRepo.save.mock.calls[0][0].districtId;

    it('leaves the district untouched when it is not in the payload', async () => {
      const out = await service.update('p1', { full_name: 'Amina K' }, 'admin');
      expect(savedDistrict()).toBe('d1');
      expect(out.district_id).toBe('d1');
    });

    it('clears the district to null (not undefined) when it is null', async () => {
      const out = await service.update('p1', { district_id: null }, 'admin');
      expect(savedDistrict()).toBeNull();
      expect(out.district_id).toBeNull();
      expect(districtRepo.findOne).not.toHaveBeenCalled();
    });

    it('sets a new district after checking it exists', async () => {
      const id = '00000000-0000-4000-8000-000000000009';
      const out = await service.update('p1', { district_id: id }, 'admin');
      expect(districtRepo.findOne).toHaveBeenCalledWith({ where: { id } });
      expect(savedDistrict()).toBe(id);
      expect(out.district_id).toBe(id);
    });
  });

  it('listAdmin orders by the entity property so take() with joins does not 500', async () => {
    await service.listAdmin(10);
    // With take() and joins TypeORM resolves the order-by against entity metadata,
    // where the column name p.full_name is unknown (the live GET returned 500).
    expect(listQb.orderBy).toHaveBeenCalledWith('p.fullName', 'ASC');
    expect(listQb.take).toHaveBeenCalledWith(10);
  });
});
