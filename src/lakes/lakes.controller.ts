import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { LakesService } from './lakes.service';

/** Open Data API: read-only, no auth — safety information is never gated (PRD R1). */
@ApiTags('lakes')
@Controller()
export class LakesController {
  constructor(private readonly lakes: LakesService) {}

  /* ------------------------------------------------------------------ */
  /*  Public read-only endpoints                                         */
  /* ------------------------------------------------------------------ */

  @Public()
  @Get('lakes')
  @ApiOperation({ summary: 'Monitored lakes with current tier (paginated)' })
  list(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.lakes.list(page, pageSize);
  }

  @Public()
  @Get('hot-lakes')
  @ApiOperation({ summary: 'High and critical risk lakes (hot-lakes)' })
  listHotLakes() {
    return this.lakes.listHotLakes();
  }

  @Public()
  @Get('lakes-admin')
  @ApiOperation({ summary: 'Admin-shaped lake list (public, no auth)' })
  listLakesAdminPublic() {
    return this.lakes.listAdmin();
  }

  @Public()
  @Get('lakes/:id')
  @ApiOperation({ summary: 'One lake' })
  byId(@Param('id', ParseUUIDPipe) id: string) {
    return this.lakes.byId(id);
  }

  @Public()
  @Get('lakes/:id/detail')
  @ApiOperation({ summary: 'Lake detail with history, alerts, glaciers' })
  lakeDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.lakes.lakeDetail(id);
  }

  @Public()
  @Get('lakes/:id/observations')
  @ApiOperation({
    summary: 'Area time series for a lake (paginated, newest first)',
  })
  observations(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.lakes.listObservations(id, page, pageSize);
  }

  /* ------------------------------------------------------------------ */
  /*  Auth-required endpoints                                            */
  /* ------------------------------------------------------------------ */

  @Get('lakes/:id/hazard-scores')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Hazard scores for a lake (auth required)' })
  hazardScores(@Param('id', ParseUUIDPipe) id: string) {
    return this.lakes.listHazardScores(id);
  }

  /* ------------------------------------------------------------------ */
  /*  Admin CRUD                                                         */
  /* ------------------------------------------------------------------ */

  @Get('admin/lakes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: List all lakes' })
  listAdmin() {
    return this.lakes.listAdmin();
  }

  @Post('admin/lakes')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Create lake' })
  createLake(@Body() dto: any, @Req() req: any) {
    return this.lakes.createLake(dto, req.user.sub);
  }

  @Put('admin/lakes/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Update lake' })
  updateLake(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: any,
    @Req() req: any,
  ) {
    return this.lakes.updateLake(id, dto, req.user.sub);
  }

  @Delete('admin/lakes/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin: Delete lake' })
  deleteLake(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('reason') reason: string,
    @Req() req: any,
  ) {
    if (!reason || reason.trim() === '') {
      throw new (require('@nestjs/common').BadRequestException)(
        'reason is required',
      );
    }
    return this.lakes.deleteLake(id, reason, req.user.sub);
  }
}
