import { PushDevicesService } from './push-devices.service';
import { PushDevice } from './entities/push-device.entity';
import { User } from '../users/entities/user.entity';

describe('PushDevicesService', () => {
  const devices = {
    upsert: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const users = { findOne: jest.fn() };
  const service = new PushDevicesService(
    devices as unknown as import('typeorm').Repository<PushDevice>,
    users as unknown as import('typeorm').Repository<User>,
  );

  beforeEach(() => jest.clearAllMocks());

  it('upserts a token as active and records when it was last seen', async () => {
    await expect(
      service.register('a-valid-device-token-123456789', 'android'),
    ).resolves.toEqual({ registered: true });
    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    expect(devices.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'a-valid-device-token-123456789',
        platform: 'android',
        active: true,
        userId: null,
        lastSeenAt: expect.any(Date),
      }),
      ['token'],
    );
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
  });

  it('deactivates a token instead of deleting its delivery history', async () => {
    await expect(
      service.unregister('a-valid-device-token-123456789'),
    ).resolves.toEqual({ unregistered: true });
    expect(devices.update).toHaveBeenCalledWith(
      { token: 'a-valid-device-token-123456789' },
      { active: false },
    );
  });

  it('registers an active CHW device to the authenticated user', async () => {
    users.findOne.mockResolvedValue({
      id: 'chw-1',
      role: 'chw',
      active: true,
    });

    await expect(
      service.registerForUser(
        'a-valid-device-token-123456789',
        'android',
        'chw-1',
      ),
    ).resolves.toEqual({ registered: true });
    /* eslint-disable @typescript-eslint/no-unsafe-assignment */
    expect(devices.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'a-valid-device-token-123456789',
        platform: 'android',
        active: true,
        userId: 'chw-1',
        lastSeenAt: expect.any(Date),
      }),
      ['token'],
    );
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
  });

  it('rejects inactive users and users without a downstream facility role', async () => {
    users.findOne.mockResolvedValue({
      id: 'viewer-1',
      role: 'viewer',
      active: true,
    });

    await expect(
      service.registerForUser(
        'a-valid-device-token-123456789',
        'android',
        'viewer-1',
      ),
    ).rejects.toThrow(
      'Only an active CHW or facility admin can register a scoped push device',
    );
    expect(devices.upsert).not.toHaveBeenCalled();
  });
});
