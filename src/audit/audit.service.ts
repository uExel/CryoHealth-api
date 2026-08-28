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

function csvCell(value: unknown): string {
  let s: string;
  if (value === null || value === undefined) s = '';
  else if (value instanceof Date) s = value.toISOString();
  else if (typeof value === 'object') s = JSON.stringify(value);
  else s = String(value);
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
    const cells = [
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

  private buildWhereClause(query: AuditQueryDto): { whereSql: string; params: any[] } {
    const conditions: string[] = [];
    const params: any[] = [];
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

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
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
      const rows = await this.dataSource.query(rowsSql, params);
      const csvString = toCsv(rows as AuditExportRow[]);
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

    const queryParams = [...params, pageSize, offset];
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
      this.dataSource.query(countSql, params),
      this.listAuditActors(),
      this.listAuditEntityTypes(),
    ]);

    const total = Number(countRes[0]?.count ?? 0);

    return {
      isCsv: false,
      rows,
      total,
      page,
      pageSize,
      actors,
      entityTypes,
    };
  }

  async listAuditActors() {
    return this.dataSource.query(`
      SELECT DISTINCT a."actorId" AS id, u.name, u."lhwId" AS lhw_id
      FROM audit a
      JOIN users u ON u.id = a."actorId"
      ORDER BY u.name
    `);
  }

  async listAuditEntityTypes() {
    const rows = await this.dataSource.query(`
      SELECT DISTINCT "entityType" AS entity_type FROM audit ORDER BY "entityType"
    `);
    return rows.map((r: any) => r.entity_type as string);
  }
}
