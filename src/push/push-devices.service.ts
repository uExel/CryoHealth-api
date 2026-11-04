import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { PushDevice, PushPlatform } from './entities/push-device.entity';

@Injectable()
export class PushDevicesService {
  constructor(
    @InjectRepository(PushDevice)
    private readonly devices: Repository<PushDevice>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async register(token: string, platform: PushPlatform) {
    await this.upsert(token, platform, null);
    return { registered: true };
  }

  async registerForUser(token: string, platform: PushPlatform, userId: string) {
    const user = await this.users.findOne({
      where: { id: userId, active: true },
    });
    if (!user || !['chw', 'facility_admin'].includes(user.role)) {
      throw new ForbiddenException(
        'Only an active CHW or facility admin can register a scoped push device',
      );
    }

    await this.upsert(token, platform, userId);
    return { registered: true };
  }

  async unregister(token: string) {
    await this.devices.update({ token }, { active: false });
    return { unregistered: true };
  }

  private upsert(token: string, platform: PushPlatform, userId: string | null) {
    return this.devices.upsert(
      { token, platform, active: true, userId, lastSeenAt: new Date() },
      ['token'],
    );
  }
}
