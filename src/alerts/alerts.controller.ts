import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowServiceKey } from '../common/decorators/allow-service-key.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtPayload } from '../common/types/jwt-payload.type';
import { AlertsService } from './alerts.service';
import { IssueAlertDto } from './dto/issue-alert.dto';
import { OverrideAlertDto } from './dto/override-alert.dto';
import { RecordHazardScoreDto } from './dto/record-hazard-score.dto';

@ApiTags('alerts')
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary:
      'Active alerts (paginated). Public — safety information is never gated.',
  })
  feed(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
    @Query('includeCleared') includeCleared?: string,
  ) {
    return this.alerts.feed(page, pageSize, includeCleared === 'true');
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'One alert' })
  byId(@Param('id', ParseUUIDPipe) id: string) {
    return this.alerts.byId(id);
  }

  @Post('hazard-scores')
  @Roles('cryohealth_admin')
  @AllowServiceKey()
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "The geo service reports a new hazard score here. A tier different from the lake's " +
      'current one creates exactly one active alert (DB-enforced dedupe). Accepts either ' +
      'a cryohealth_admin JWT or the x-api-key header (GEO_SERVICE_API_KEY) — the geo ' +
      'service authenticates as the latter, since it has no user to log in as.',
  })
  recordHazardScore(@Body() dto: RecordHazardScoreDto) {
    return this.alerts.recordHazardScore(dto);
  }

  @Post()
  @Roles('cryohealth_admin', 'facility_admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Manually issue an alert. Reason is mandatory and audited.',
  })
  issue(@Body() dto: IssueAlertDto, @Req() req: { user: JwtPayload }) {
    return this.alerts.issueManual(dto, req.user.sub);
  }

  @Patch(':id')
  @Roles('cryohealth_admin', 'facility_admin')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Upgrade, downgrade, or clear an alert. Reason is mandatory and audited.',
  })
  override(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OverrideAlertDto,
    @Req() req: { user: JwtPayload },
  ) {
    return this.alerts.override(id, dto, req.user.sub);
  }
}
