import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

type CountRow = { count: number };

@Injectable()
export class KpisService {
  constructor(private readonly dataSource: DataSource) {}

  async getKpis() {
    const since30 = new Date(Date.now() - 30 * 864e5).toISOString();
    const since7 = new Date(Date.now() - 7 * 864e5).toISOString();

    const [highLakesRes, alerts30dRes, cases7dRes, chwsRes] =
      (await Promise.all([
        this.dataSource.query(
          `SELECT count(*)::int AS count FROM lakes WHERE "currentTier" IN ('high', 'critical')`,
        ),
        this.dataSource.query(
          `SELECT count(*)::int AS count FROM alerts WHERE "createdAt" >= $1`,
          [since30],
        ),
        this.dataSource.query(
          `SELECT count(*)::int AS count FROM cases WHERE created_at >= $1 AND deleted_at IS NULL`,
          [since7],
        ),
        this.dataSource.query(
          `SELECT count(*)::int AS count FROM users WHERE role = 'chw' AND active = true`,
        ),
      ])) as CountRow[][];

    return {
      highLakes: Number(highLakesRes[0]?.count ?? 0),
      alerts30d: Number(alerts30dRes[0]?.count ?? 0),
      cases7d: Number(cases7dRes[0]?.count ?? 0),
      chws: Number(chwsRes[0]?.count ?? 0),
    };
  }
}
