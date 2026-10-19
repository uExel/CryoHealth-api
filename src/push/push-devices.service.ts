import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushDevice, PushPlatform } from './entities/push-device.entity';

@Injectable()
export class PushDevicesService {
  constructor(
    @InjectRepository(PushDevice)
    private readonly devices: Repository<PushDevice>,
  ) {}

  async register(token: string, platform: PushPlatform) {
    await this.devices.upsert(
      { token, platform, active: true, lastSeenAt: new Date() },
      ['token'],
    );
    return { registered: true };
  }

  async unregister(token: string) {
    await this.devices.update({ token }, { active: false });
    return { unregistered: true };
  }
}
