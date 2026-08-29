import { Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Public database probe for load balancers' })
  checkPublic() {
    return this.healthService.checkPublic();
  }

  @Roles('cryohealth_admin')
  @ApiBearerAuth()
  @Get('admin/health')
  @ApiOperation({
    summary: 'Aggregated system health probing API and CryoHealth-geo',
  })
  getAdminSystemHealth() {
    return this.healthService.getAdminSystemHealth();
  }

  @Roles('cryohealth_admin')
  @ApiBearerAuth()
  @Post('admin/health/run')
  @ApiOperation({ summary: 'Trigger ingest/scoring pass on CryoHealth-geo' })
  runGeo() {
    return this.healthService.runGeo();
  }

  @Roles('cryohealth_admin')
  @ApiBearerAuth()
  @Post('admin/health/run-hazard')
  @ApiOperation({ summary: 'Trigger hazard pass on CryoHealth-geo' })
  runGeoHazard() {
    return this.healthService.runGeoHazard();
  }
}
