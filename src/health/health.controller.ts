import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Public } from '../common/decorators/public.decorator';

/** Public: load balancers and orchestrators probe this with no token. */
@Public()
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly db: DataSource) {}

  @Get()
  async check() {
    let database = 'down';
    try {
      await this.db.query('SELECT 1');
      database = 'up';
    } catch {
      /* stays down */
    }
    return { status: database === 'up' ? 'ok' : 'degraded', database };
  }
}
