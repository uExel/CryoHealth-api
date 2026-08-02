import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LakesService } from './lakes.service';

/** Open Data API: read-only, no auth — safety information is never gated (PRD R1). */
@ApiTags('open-data')
@Controller('lakes')
export class LakesController {
  constructor(private readonly lakes: LakesService) {}

  @Get()
  @ApiOperation({ summary: 'Monitored lakes with current tier (paginated)' })
  list(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.lakes.list(page, pageSize);
  }

  @Get(':id')
  @ApiOperation({ summary: 'One lake' })
  byId(@Param('id', ParseUUIDPipe) id: string) {
    return this.lakes.byId(id);
  }

  @Get(':id/observations')
  @ApiOperation({
    summary: 'Area time series for a lake (paginated, newest first)',
  })
  observations(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize?: number,
  ) {
    return this.lakes.observations_(id, page, pageSize);
  }
}
