import { Body, Controller, Delete, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../common/types/jwt-payload.type';
import {
  RegisterPushDeviceDto,
  UnregisterPushDeviceDto,
} from './dto/register-push-device.dto';
import { PushDevicesService } from './push-devices.service';

@ApiTags('push')
@Controller('push/devices')
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class PushDevicesController {
  constructor(private readonly devices: PushDevicesService) {}

  @Public()
  @Post()
  @ApiOperation({
    summary: 'Register or refresh a guest-capable FCM device token',
  })
  register(@Body() dto: RegisterPushDeviceDto) {
    return this.devices.register(dto.token, dto.platform);
  }

  @Post('for-user')
  @Roles('chw', 'facility_admin')
  @ApiOperation({
    summary: 'Register a push device for the authenticated facility user',
  })
  registerForUser(
    @Body() dto: RegisterPushDeviceDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.devices.registerForUser(dto.token, dto.platform, req.user.sub);
  }

  @Public()
  @Delete()
  @ApiOperation({ summary: 'Disable push delivery for this device token' })
  unregister(@Body() dto: UnregisterPushDeviceDto) {
    return this.devices.unregister(dto.token);
  }
}
