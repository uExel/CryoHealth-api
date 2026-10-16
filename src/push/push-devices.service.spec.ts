import { PushDevicesService } from './push-devices.service';
import { PushDevice } from './entities/push-device.entity';

describe('PushDevicesService', () => {
  const devices = {
    upsert: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const service = new PushDevicesService(
    devices as unknown as import('typeorm').Repository<PushDevice>,
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
});
