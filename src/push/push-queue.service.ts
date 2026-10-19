import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

@Injectable()
export class PushQueueService {
  async enqueueAlert(manager: EntityManager, alertId: string): Promise<void> {
    await manager.query(
      `INSERT INTO "push_deliveries" ("alert_id", "device_id", "title", "body", "tier")
       SELECT a."id", d."id", a."title", a."body", a."tier"
       FROM "push_devices" AS d, "alerts" AS a
       WHERE d."active" = true AND a."id" = $1
       ON CONFLICT ("alert_id", "device_id") DO NOTHING`,
      [alertId],
    );
  }
}
