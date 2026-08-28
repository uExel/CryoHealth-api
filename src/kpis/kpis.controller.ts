import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { KpisService } from './kpis.service';

@Public()
@ApiTags('kpis')
@Controller('kpis')
export class KpisController {
  constructor(private readonly kpisService: KpisService) {}

  @Get()
  @ApiOperation({ summary: 'Summary KPIs for the dashboard' })
  getKpis() {
    return this.kpisService.getKpis();
  }
}
