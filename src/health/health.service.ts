import { Injectable, BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

export type Probe<T> = { reachable: true; data: T } | { reachable: false; error: string };

@Injectable()
export class HealthService {
  constructor(
    private readonly db: DataSource,
    private readonly config: ConfigService,
  ) {}

  async checkPublic() {
    let database = 'down';
    try {
      await this.db.query('SELECT 1');
      database = 'up';
    } catch {
      /* stays down */
    }
    return { status: database === 'up' ? 'ok' : 'degraded', database };
  }

  private async probe<T>(fn: () => Promise<T>): Promise<Probe<T>> {
    try {
      return { reachable: true, data: await fn() };
    } catch (err) {
      return { reachable: false, error: (err as Error).message };
    }
  }

  private getGeoUrl(): string {
    const url = this.config.get<string>('CRYOHEALTH_GEO_URL') || process.env.CRYOHEALTH_GEO_URL;
    if (!url) throw new Error('Missing CRYOHEALTH_GEO_URL environment variable');
    return url.replace(/\/+$/, '');
  }

  async getAdminSystemHealth() {
    const probeApi = async () => this.checkPublic();
    const probeGeo = async () => {
      const geoUrl = this.getGeoUrl();
      const res = await fetch(`${geoUrl}/health`);
      if (!res.ok) throw new Error(`CryoHealth-geo /health returned ${res.status}`);
      return res.json();
    };

    const [api, geo] = await Promise.all([
      this.probe(probeApi),
      this.probe(probeGeo),
    ]);

    return {
      api,
      geo,
      checkedAt: new Date().toISOString(),
    };
  }

  async runGeo() {
    try {
      const geoUrl = this.getGeoUrl();
      const res = await fetch(`${geoUrl}/run`, { method: 'POST' });
      if (!res.ok) throw new Error(`CryoHealth-geo /run returned ${res.status}`);
      const result = await res.json();
      return { ok: true, result };
    } catch (err) {
      throw new BadGatewayException((err as Error).message);
    }
  }

  async runGeoHazard() {
    try {
      const geoUrl = this.getGeoUrl();
      const res = await fetch(`${geoUrl}/run-hazard`, { method: 'POST' });
      if (!res.ok) throw new Error(`CryoHealth-geo /run-hazard returned ${res.status}`);
      const result = await res.json();
      return { ok: true, result };
    } catch (err) {
      throw new BadGatewayException((err as Error).message);
    }
  }
}
