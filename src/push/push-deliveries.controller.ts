import {
  Controller,
  Get,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { PushDeliveriesService } from './push-deliveries.service';

@ApiTags('push')
@ApiBearerAuth()
@Controller('push/deliveries')
export class PushDeliveriesController {
  constructor(private readonly deliveries: PushDeliveriesService) {}

  @Roles('cryohealth_admin')
  @Get('summary')
  @ApiOperation({
    summary:
      'Push delivery health: status counts, top failure reasons, device counts',
  })
  summary(
    @Query('alertId', new ParseUUIDPipe({ optional: true })) alertId?: string,
  ) {
    return this.deliveries.summary(alertId);
  }

  @Roles('cryohealth_admin')
  @Get()
  @ApiOperation({ summary: 'Per-device push delivery log (paginated)' })
  list(
    @Query('alertId', new ParseUUIDPipe({ optional: true })) alertId?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.deliveries.list(alertId, page, pageSize);
  }
}
