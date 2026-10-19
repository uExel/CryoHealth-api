import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface DeliveryStatusCounts {
  pending: number;
  sending: number;
  sent: number;
  failed: number;
}

@Injectable()
export class PushDeliveriesService {
  constructor(private readonly dataSource: DataSource) {}

  async summary(alertId?: string) {
    const params = alertId ? [alertId] : [];
    const filter = alertId ? `WHERE "alert_id" = $1` : '';

    const statusRows = (await this.dataSource.query(
      `SELECT "status", COUNT(*)::int AS count FROM "push_deliveries" ${filter} GROUP BY "status"`,
      params,
    )) as { status: keyof DeliveryStatusCounts; count: number }[];
    const totals: DeliveryStatusCounts = {
      pending: 0,
      sending: 0,
      sent: 0,
      failed: 0,
    };
    for (const row of statusRows) totals[row.status] = row.count;

    const errors = (await this.dataSource.query(
      `SELECT "last_error" AS error, COUNT(*)::int AS count
       FROM "push_deliveries"
       ${filter ? `${filter} AND` : 'WHERE'} "status" = 'failed' AND "last_error" IS NOT NULL
       GROUP BY "last_error" ORDER BY count DESC LIMIT 20`,
      params,
    )) as { error: string; count: number }[];

    const devices = (await this.dataSource.query(
      `SELECT "platform", "active", COUNT(*)::int AS count
       FROM "push_devices" GROUP BY "platform", "active"`,
    )) as { platform: string; active: boolean; count: number }[];

    return { alertId: alertId ?? null, deliveries: totals, errors, devices };
  }

  async list(alertId: string | undefined, page = 1, pageSize = 50) {
    const size = Math.min(Math.max(pageSize, 1), 100);
    const offset = (Math.max(page, 1) - 1) * size;
    const params: unknown[] = alertId
      ? [alertId, size, offset]
      : [size, offset];
    const filter = alertId ? `WHERE d."alert_id" = $1` : '';
    const limitAt = alertId ? 2 : 1;
    const rows = (await this.dataSource.query(
      `SELECT d."id", d."alert_id" AS "alertId", d."status",
              d."attempt_count" AS "attemptCount", d."next_attempt_at" AS "nextAttemptAt",
              d."sent_at" AS "sentAt", d."last_error" AS "lastError",
              d."title", d."tier", dev."platform"
       FROM "push_deliveries" d
       JOIN "push_devices" dev ON dev."id" = d."device_id"
       ${filter}
       ORDER BY d."created_at" DESC
       LIMIT $${limitAt} OFFSET $${limitAt + 1}`,
      params,
    )) as unknown[];
    return { page, pageSize: size, items: rows };
  }
}
