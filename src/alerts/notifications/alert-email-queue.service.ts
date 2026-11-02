import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';

@Injectable()
export class AlertEmailQueueService {
  private readonly logger = new Logger(AlertEmailQueueService.name);

  async enqueueAlert(manager: EntityManager, alertId: string): Promise<void> {
    await manager.query(
      `INSERT INTO "alert_email_deliveries"
         ("alert_id", "user_id", "email", "subject", "body")
       SELECT a."id", u."id", u."email",
         '[' || upper(a."tier"::text) || '] ' || a."title",
         concat_ws(E'\\n\\n', NULLIF(a."body", ''),
           CASE
             WHEN NULLIF(a."estimated_window", '') IS NOT NULL
               THEN 'Impact window: ' || a."estimated_window"
             WHEN a."windowStart" IS NOT NULL OR a."windowEnd" IS NOT NULL
               THEN 'Impact window: ' || concat_ws(' – ', a."windowStart"::text, a."windowEnd"::text)
           END,
           NULLIF(a."downstreamSummary", ''))
       FROM "alerts" AS a
       JOIN "users" AS u ON u."active" = true AND u."role" = 'chw'
       WHERE a."id" = $1
         AND u."email" IS NOT NULL
         AND (
           a."lakeId" IS NULL
           OR EXISTS (
             SELECT 1
             FROM "facilities" AS f
             WHERE f."id" = u."facilityId"
               AND f."lakeId" = a."lakeId"
           )
         )
       ON CONFLICT ("alert_id", "user_id") DO UPDATE
       SET "email" = EXCLUDED."email",
           "subject" = EXCLUDED."subject",
           "body" = EXCLUDED."body",
           "status" = 'pending',
           "attempt_count" = 0,
           "next_attempt_at" = NOW(),
           "sent_at" = NULL,
           "last_error" = NULL,
           "updated_at" = NOW()`,
      [alertId],
    );

    const missingEmail = (await manager.query(
      `SELECT count(*)::int AS count
       FROM "alerts" AS a
       JOIN "users" AS u ON u."active" = true AND u."role" = 'chw'
       WHERE a."id" = $1
         AND u."email" IS NULL
         AND (
           a."lakeId" IS NULL
           OR EXISTS (
             SELECT 1
             FROM "facilities" AS f
             WHERE f."id" = u."facilityId"
               AND f."lakeId" = a."lakeId"
           )
         )`,
      [alertId],
    )) as { count: number }[];

    if (missingEmail[0]?.count > 0) {
      this.logger.warn(
        `Alert ${alertId} has ${missingEmail[0].count} mapped CHW recipient(s) without an email address; those recipients were not queued.`,
      );
    }
  }
}
