import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

@Injectable()
export class PushQueueService {
  async enqueueAlert(manager: EntityManager, alertId: string): Promise<void> {
    await manager.query(
      `INSERT INTO "push_deliveries" ("alert_id", "device_id", "title", "body", "tier")
       SELECT a."id", d."id", a."title", a."body", a."tier"
       FROM "push_devices" AS d, "alerts" AS a
       WHERE d."active" = true
         AND a."id" = $1
         AND (
           a."lakeId" IS NULL
           OR EXISTS (
             SELECT 1
             FROM "users" AS u
             JOIN "facilities" AS f ON f."id" = u."facilityId"
             WHERE u."id" = d."user_id"
               AND u."active" = true
               AND u."role" IN ('chw', 'facility_admin')
               AND f."lakeId" = a."lakeId"
           )
         )
       ON CONFLICT ("alert_id", "device_id") DO UPDATE
       SET "title" = EXCLUDED."title",
           "body" = EXCLUDED."body",
           "tier" = EXCLUDED."tier",
           "status" = 'pending',
           "attempt_count" = 0,
           "next_attempt_at" = NOW(),
           "sent_at" = NULL,
           "last_error" = NULL,
           "updated_at" = NOW()`,
      [alertId],
    );
  }
}
