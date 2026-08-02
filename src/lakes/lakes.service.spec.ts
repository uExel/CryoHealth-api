import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Lake } from './entities/lake.entity';
import { Observation } from './entities/observation.entity';
import { LakesService } from './lakes.service';

describe('LakesService', () => {
  const lakesRepo = { findAndCount: jest.fn(), findOne: jest.fn() };
  const obsRepo = { findAndCount: jest.fn() };
  let service: LakesService;

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        LakesService,
        { provide: getRepositoryToken(Lake), useValue: lakesRepo },
        { provide: getRepositoryToken(Observation), useValue: obsRepo },
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
});
