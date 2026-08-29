import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditQueryDto } from './dto/audit-query.dto';

export type AuditExportRow = {
  created_at: Date | string;
  actor_name: string | null;
  actor_lhw_id: string | null;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  reason: string | null;
  meta: unknown;
};

type CountRow = { count: number };
type ActorRow = { id: string; name: string; lhw_id: string };
type EntityTypeRow = { entity_type: string };

function csvCell(value: unknown): string {
  let s: string;
  if (value === null || value === undefined) s = '';
  else if (value instanceof Date) s = value.toISOString();
  else if (typeof value === 'object') s = JSON.stringify(value);
  else if (typeof value === 'string') s = value;
  else s = String(value as string | number | boolean | bigint);
  return `"${s.replace(/"/g, '""')}"`;
}

function toCsv(rows: AuditExportRow[]): string {
  const header = [
    'Time',
    'Actor',
    'Actor LHW ID',
    'Actor ID',
    'Action',
    'Entity type',
    'Entity ID',
    'Reason',
    'Details',
  ];
  const lines = [header.map(csvCell).join(',')];
  for (const r of rows) {
    const cells: unknown[] = [
      r.created_at,
      r.actor_name,
      r.actor_lhw_id,
      r.actor_id,
      r.action,
      r.entity_type,
      r.entity_id,
      r.reason,
      r.meta,
    ];
    lines.push(cells.map(csvCell).join(','));
  }
  const bom = String.fromCharCode(0xfeff);
  return bom + lines.join('\r\n');
}

@Injectable()
export class AuditService {
  constructor(private readonly dataSource: DataSource) {}

  private buildWhereClause(query: AuditQueryDto): {
    whereSql: string;
    params: unknown[];
  } {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (query.actorId) {
      conditions.push(`a."actorId" = $${idx++}`);
      params.push(query.actorId);
    }
    if (query.entityType) {
      conditions.push(`a."entityType" = $${idx++}`);
      params.push(query.entityType);
    }
    if (query.from) {
      conditions.push(`a."createdAt" >= $${idx++}::date`);
      params.push(query.from);
    }
    if (query.to) {
      conditions.push(`a."createdAt" < ($${idx++}::date + 1)`);
      params.push(query.to);
    }

    const whereSql =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereSql, params };
  }

  async getAuditLog(query: AuditQueryDto) {
    const { whereSql, params } = this.buildWhereClause(query);

    if (query.format === 'csv') {
      const limit = 10000;
      const rowsSql = `
        SELECT a."createdAt" AS created_at, u.name AS actor_name, u."lhwId" AS actor_lhw_id,
               a."actorId" AS actor_id, a.action, a."entityType" AS entity_type,
               a."entityId" AS entity_id, a.reason, a.meta
        FROM audit a
        LEFT JOIN users u ON u.id = a."actorId"
        ${whereSql}
        ORDER BY a."createdAt" DESC
        LIMIT ${limit}
      `;
      const rows = await this.dataSource.query(rowsSql, params as any[]);
      const csvString = toCsv(rows);
      const stamp = new Date().toISOString().slice(0, 10);
      return {
        isCsv: true,
        csvString,
        filename: `audit-log-${stamp}.csv`,
      };
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const offset = (page - 1) * pageSize;

    const queryParams: unknown[] = [...params, pageSize, offset];
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;

    const rowsSql = `
      SELECT a.id, a."actorId" AS actor_id, a.action, a."entityType" AS entity_type,
             a."entityId" AS entity_id, a.reason, a.meta, a."createdAt" AS created_at,
             u.name AS actor_name, u."lhwId" AS actor_lhw_id, u.role::text AS actor_role
      FROM audit a
      LEFT JOIN users u ON u.id = a."actorId"
      ${whereSql}
      ORDER BY a."createdAt" DESC
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const countSql = `SELECT count(*)::int AS count FROM audit a ${whereSql}`;

    const [rows, countRes, actors, entityTypes] = await Promise.all([
      this.dataSource.query(rowsSql, queryParams),
      this.dataSource.query(countSql, params as any[]),
      this.listAuditActors(),
      this.listAuditEntityTypes(),
    ]);
    const typedRows = rows as AuditExportRow[];
    const typedCountRes = countRes as CountRow[];

    const total = Number(
      (typedCountRes[0] as CountRow | undefined)?.count ?? 0,
    );

    return {
      isCsv: false,
      rows: typedRows,
      total,
      page,
      pageSize,
      actors,
      entityTypes,
    };
  }

  async listAuditActors(): Promise<ActorRow[]> {
    return await this.dataSource.query(`
      SELECT DISTINCT a."actorId" AS id, u.name, u."lhwId" AS lhw_id
      FROM audit a
      JOIN users u ON u.id = a."actorId"
      ORDER BY u.name
    `);
  }

  async listAuditEntityTypes(): Promise<EntityTypeRow[]> {
    const rows = await this.dataSource.query(
      `SELECT DISTINCT "entityType" AS entity_type FROM audit ORDER BY "entityType"`,
    );
    return rows.map((r) => r.entity_type);
  }
}
