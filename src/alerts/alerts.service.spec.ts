import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Alert } from './entities/alert.entity';
import { User } from '../users/entities/user.entity';
import { AlertsService } from './alerts.service';
import { NOTIFICATION_CHANNELS } from './notifications/notification-channel';

describe('AlertsService', () => {
  const alertsRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
  };
  const usersRepo = { find: jest.fn() };
  const channel = {
    kind: 'test',
    send: jest.fn().mockResolvedValue(undefined),
  };

  // Mocks a transaction() call by handing the callback an EntityManager stand-in whose
  // getRepository() returns per-entity mocks the test configures via `managerRepos`.
  type MockRepo = Record<string, jest.Mock>;
  let managerRepos: Record<string, MockRepo>;
  const dataSource = {
    transaction: jest.fn(
      (
        cb: (m: {
          getRepository: (e: { name: string }) => MockRepo;
        }) => unknown,
      ) => cb({ getRepository: (entity) => managerRepos[entity.name] }),
    ),
  };

  let service: AlertsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    managerRepos = {};
    const mod = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: getRepositoryToken(Alert), useValue: alertsRepo },
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: NOTIFICATION_CHANNELS, useValue: [channel] },
      ],
    }).compile();
    service = mod.get(AlertsService);
  });

  describe('recipientsFor', () => {
    it('only includes active CHWs/facility_admins with a reachable address', async () => {
      usersRepo.find.mockResolvedValue([
        { id: '1', name: 'Zainab', phone: '+92300', lhwId: null, role: 'chw' },
        { id: '2', name: 'No contact', phone: null, lhwId: null, role: 'chw' },
      ]);
      const recipients = await service.recipientsFor('lake-1');

      // jest's AsymmetricMatcher typing is loose here, not a real type gap in this code
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      expect(usersRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            active: true,
            facility: { lakeId: 'lake-1' },
          }),
        }),
      );
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      expect(recipients).toEqual([
        { userId: '1', name: 'Zainab', address: '+92300' },
      ]);
    });
  });

  describe('recordHazardScore', () => {
    const lake = {
      id: 'lake-1',
      name: 'Shishper',
      valley: 'Hassanabad',
      district: 'Hunza',
      currentTier: 'watch',
    };

    function mockRepos({
      insertResult,
    }: { insertResult?: { identifiers: { id: string }[] } } = {}) {
      const lakeRepo = {
        findOne: jest.fn().mockResolvedValue(lake),
        update: jest.fn(),
      };
      const hazardRepo = { insert: jest.fn().mockResolvedValue({}) };
      const alertRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnThis(),
          into: jest.fn().mockReturnThis(),
          values: jest.fn().mockReturnThis(),
          orIgnore: jest.fn().mockReturnThis(),
          execute: jest
            .fn()
            .mockResolvedValue(
              insertResult ?? { identifiers: [{ id: 'alert-1' }] },
            ),
        }),
        findOneOrFail: jest
          .fn()
          .mockResolvedValue({ id: 'alert-1', tier: 'high' }),
        findOne: jest.fn().mockResolvedValue(null),
      };
      managerRepos = {
        Lake: lakeRepo,
        HazardScore: hazardRepo,
        Alert: alertRepo,
      };
      return { lakeRepo, hazardRepo, alertRepo };
    }

    it('does nothing but record the score when the tier has not changed', async () => {
      const { lakeRepo } = mockRepos();
      const result = await service.recordHazardScore({
        lakeId: 'lake-1',
        runId: 'r1',
        score: 0.4,
        tier: 'watch',
        components: {},
      });
      expect(result).toEqual({ alert: null, deduped: false });
      expect(lakeRepo.update).not.toHaveBeenCalled();
    });

    it('creates one alert and updates the lake tier on a real transition', async () => {
      const { lakeRepo } = mockRepos();
      const result = await service.recordHazardScore({
        lakeId: 'lake-1',
        runId: 'r1',
        score: 0.9,
        tier: 'high',
        components: {},
      });
      expect(result.deduped).toBe(false);
      expect(result.alert?.id).toBe('alert-1');
      expect(lakeRepo.update).toHaveBeenCalledWith('lake-1', {
        currentTier: 'high',
      });
      expect(channel.send).toHaveBeenCalled();
    });

    it('dedupes without creating a second alert when one is already active for that tier', async () => {
      const { lakeRepo, alertRepo } = mockRepos({
        insertResult: { identifiers: [] },
      });
      alertRepo.findOne.mockResolvedValue({
        id: 'existing-alert',
        tier: 'high',
      });
      const result = await service.recordHazardScore({
        lakeId: 'lake-1',
        runId: 'r2',
        score: 0.91,
        tier: 'high',
        components: {},
      });
      expect(result.deduped).toBe(true);
      expect(result.alert?.id).toBe('existing-alert');
      expect(lakeRepo.update).not.toHaveBeenCalled();
      expect(channel.send).not.toHaveBeenCalled();
    });

    it('404s an unknown lake', async () => {
      const { lakeRepo } = mockRepos();
      lakeRepo.findOne.mockResolvedValue(null);
      await expect(
        service.recordHazardScore({
          lakeId: 'ghost',
          runId: 'r1',
          score: 0.1,
          tier: 'watch',
          components: {},
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('issueManual', () => {
    it('409s with a pointer to PATCH when an active alert already exists for that lake+tier', async () => {
      const alertRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          insert: jest.fn().mockReturnThis(),
          into: jest.fn().mockReturnThis(),
          values: jest.fn().mockReturnThis(),
          execute: jest.fn().mockRejectedValue({ code: '23505' }),
        }),
        findOne: jest.fn().mockResolvedValue({ id: 'existing-alert' }),
      };
      managerRepos = {
        Alert: alertRepo,
        AuditEntry: { insert: jest.fn() },
        Lake: { update: jest.fn() },
      };

      await expect(
        service.issueManual(
          {
            lakeId: 'lake-1',
            tier: 'high',
            title: 't',
            body: 'b',
            reason: 'flooding observed',
          },
          'admin-1',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('override', () => {
    it('rejects when neither tier nor clear is given', async () => {
      await expect(
        service.override('a1', { reason: 'oops' }, 'admin-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('writes an audit entry with the mandatory reason when clearing', async () => {
      const auditInsert = jest.fn();
      managerRepos = {
        Alert: {
          findOne: jest
            .fn()
            .mockResolvedValue({ id: 'a1', lakeId: 'lake-1', tier: 'high' }),
          update: jest.fn(),
          findOneOrFail: jest.fn().mockResolvedValue({
            id: 'a1',
            lakeId: 'lake-1',
            tier: 'high',
            status: 'cleared',
          }),
        },
        AuditEntry: { insert: auditInsert },
        Lake: { update: jest.fn() },
      };
      await service.override(
        'a1',
        { clear: true, reason: 'false positive, confirmed by field team' },
        'admin-1',
      );
      expect(auditInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'alert.clear',
          reason: 'false positive, confirmed by field team',
          actorId: 'admin-1',
        }),
      );
    });

    it('404s an unknown alert', async () => {
      managerRepos = { Alert: { findOne: jest.fn().mockResolvedValue(null) } };
      await expect(
        service.override('ghost', { clear: true, reason: 'x' }, 'admin-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
