import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

type CountRow = { count: number };
type SyncLogRow = {
  id: string;
  user_id: string;
  device_id: string;
  started_at: Date;
  finished_at: Date | null;
  item_count: number;
  status: string;
  detail: string | null;
  created_at: Date;
  user_name: string | null;
  user_lhw_id: string | null;
};
type ChwCaseRow = {
  id: string;
  chw_id: string;
  captured_at: Date;
  outcome: string | null;
  sync_state: string;
  device_id: string;
  client_case_id: string;
  created_at: Date;
  chw_name: string | null;
  chw_lhw_id: string | null;
};

const SYNC_PAGE_LIMIT = 200;

@Injectable()
export class SyncService {
  constructor(private readonly dataSource: DataSource) {}

  async getSyncActivity(limit = SYNC_PAGE_LIMIT) {
    const syncLogRows = (await this.dataSource.query(
      `
        SELECT s.id, s."userId" AS user_id, s."deviceId" AS device_id,
               s."startedAt" AS started_at, s."finishedAt" AS finished_at,
               s."itemCount" AS item_count, s.status, s.detail,
               s."createdAt" AS created_at,
               u.name AS user_name, u."lhwId" AS user_lhw_id
        FROM sync_log s
        LEFT JOIN users u ON u.id = s."userId"
        ORDER BY s."startedAt" DESC
        LIMIT $1
      `,
      [limit],
    )) as SyncLogRow[];
    const syncLogCountRes = (await this.dataSource.query(
      `SELECT count(*)::int AS count FROM sync_log`,
    )) as CountRow[];
    const chwCasesRows = (await this.dataSource.query(
      `
        SELECT c.id, c."chwId" AS chw_id, c."capturedAt" AS captured_at,
               c.outcome, c."syncState"::text AS sync_state,
               c."deviceId" AS device_id, c."clientCaseId" AS client_case_id,
               c."createdAt" AS created_at,
               u.name AS chw_name, u."lhwId" AS chw_lhw_id
        FROM chw_cases c
        LEFT JOIN users u ON u.id = c."chwId"
        ORDER BY c."capturedAt" DESC
        LIMIT $1
      `,
      [limit],
    )) as ChwCaseRow[];
    const chwCasesCountRes = (await this.dataSource.query(
      `SELECT count(*)::int AS count FROM chw_cases`,
    )) as CountRow[];

    const syncLogTotal = Number(syncLogCountRes[0]?.count ?? 0);
    const chwCasesTotal = Number(chwCasesCountRes[0]?.count ?? 0);

    return {
      syncLog: { rows: syncLogRows, total: syncLogTotal },
      chwCases: { rows: chwCasesRows, total: chwCasesTotal },
      limit,
    };
  }
}
