import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CasesService } from './cases.service';
import { ChwCase } from './entities/chw-case.entity';
import { CreateCaseDto } from './dto/create-case.dto';

describe('CasesService', () => {
  const repo = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((v: unknown) => v),
    findAndCount: jest.fn(),
  };
  let service: CasesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CasesService,
        { provide: getRepositoryToken(ChwCase), useValue: repo },
      ],
    }).compile();
    service = moduleRef.get(CasesService);
  });

  const dto: CreateCaseDto = {
    clientCaseId: 'device-abc-1',
    capturedAt: '2026-08-08T00:00:00.000Z',
    payload: { age: '2 years', sex: 'Female', problem: 'Fever' },
    outcome: 'Treated at home',
    deviceId: 'device-abc',
  };

  it('creates a new case when clientCaseId is unseen', async () => {
    repo.findOne.mockResolvedValue(null);
    repo.save.mockImplementation((v: unknown) => Promise.resolve(v));

    const result = await service.create('chw-1', dto);

    expect(repo.save).toHaveBeenCalledTimes(1);
    expect((result as any).clientCaseId).toBe('device-abc-1');
  });

  it('returns the existing case on a retried clientCaseId instead of duplicating', async () => {
    const existing = { id: 'case-1', clientCaseId: 'device-abc-1' } as ChwCase;
    repo.findOne.mockResolvedValue(existing);

    const result = await service.create('chw-1', dto);

    expect(repo.save).not.toHaveBeenCalled();
    expect(result).toBe(existing);
  });

  it('paginates a user\'s case history newest-first', async () => {
    repo.findAndCount.mockResolvedValue([[], 0]);

    const result = await service.listForUser('chw-1', 2, 10);

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { chwId: 'chw-1' }, skip: 10, take: 10 }),
    );
    expect(result).toEqual({ items: [], total: 0, page: 2, pageSize: 10 });
  });
});
