import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import type { PushPlatform } from '../entities/push-device.entity';

export class RegisterPushDeviceDto {
  @IsString()
  @MinLength(20)
  @MaxLength(4096)
  token: string;

  @IsIn(['android', 'ios'])
  platform: PushPlatform;
}

export class UnregisterPushDeviceDto {
  @IsString()
  @MinLength(20)
  @MaxLength(4096)
  token: string;
}
