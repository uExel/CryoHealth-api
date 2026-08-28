import { Controller, Get, Post, Query, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { SyncService } from './sync.service';

@ApiTags('sync')
@Controller()
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Roles('cryohealth_admin')
  @ApiBearerAuth()
  @Get('admin/sync')
  @ApiOperation({ summary: 'Admin sync activity report (sync_log and chw_cases)' })
  getSyncActivity(@Query('limit', new ParseIntPipe({ optional: true })) limit?: number) {
    return this.syncService.getSyncActivity(limit || 200);
  }

  @Roles('cryohealth_admin')
  @ApiBearerAuth()
  @Get('admin/sync/status')
  @ApiOperation({ summary: 'Admin sync status shortcut' })
  getSyncStatus() {
    return this.syncService.getSyncActivity(200);
  }

  @Roles('cryohealth_admin')
  @ApiBearerAuth()
  @Post('admin/sync')
  @ApiOperation({ summary: 'Admin trigger/report sync activity' })
  triggerSync() {
    return this.syncService.getSyncActivity(200);
  }
}
