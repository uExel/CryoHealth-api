import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { FirebasePushService } from './firebase-push.service';

const STALE_CLAIM_MS = 2 * 60 * 1000;
const STALE_SWEEP_INTERVAL_MS = 60 * 60 * 1000;

const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

// Retrying these cannot succeed: the payload or our credentials are wrong.
const PERMANENT_CODES = new Set([
  'messaging/invalid-argument',
  'messaging/invalid-payload',
  'messaging/payload-size-limit-exceeded',
  'messaging/mismatched-credential',
  'messaging/invalid-recipient',
  'messaging/invalid-apns-credentials',
]);

type ClaimedDelivery = {
  delivery_id: string;
  device_id: string;
  token: string;
  alert_id: string;
  title: string;
  body: string;
  tier: string;
  attempt_count: number;
};

@Injectable()
export class PushDeliveryWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PushDeliveryWorker.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private lastStaleSweep = 0;

  private readonly batchSize: number;
  private readonly maxAttempts: number;
  private readonly retryBaseMs: number;
  private readonly retryMaxMs: number;
  private readonly pollIntervalMs: number;
  private readonly staleDeviceDays: number;

  constructor(
    private readonly dataSource: DataSource,
    private readonly firebase: FirebasePushService,
    config: ConfigService,
  ) {
    this.batchSize = config.get<number>('push.batchSize') ?? 500;
    this.maxAttempts = config.get<number>('push.maxAttempts') ?? 8;
    this.retryBaseMs = config.get<number>('push.retryBaseMs') ?? 30_000;
    this.retryMaxMs = config.get<number>('push.retryMaxMs') ?? 21_600_000;
    this.pollIntervalMs = config.get<number>('push.pollIntervalMs') ?? 10_000;
    this.staleDeviceDays = config.get<number>('push.staleDeviceDays') ?? 60;
  }

  onModuleInit(): void {
    let enabled = false;
    try {
      enabled = this.firebase.initialize();
    } catch (error) {
      this.logger.error(
        `PUSH DELIVERY DISABLED — Firebase failed to initialize: ${
          error instanceof Error ? error.message : String(error)
        }. Queued alerts will not be delivered until this is fixed.`,
      );
    }
    if (!enabled) return;

    this.timer = setInterval(() => void this.tick(), this.pollIntervalMs);
    void this.tick();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    try {
      await this.processPending();
    } catch (error) {
      this.logger.error(`Push worker cycle failed: ${this.errorCode(error)}`);
    }
  }

  async processPending(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.recoverStaleClaims();
      await this.sweepStaleDevices();
      const deliveries = await this.claimBatch();
      for (let start = 0; start < deliveries.length; start += this.batchSize) {
        await this.sendBatch(deliveries.slice(start, start + this.batchSize));
      }
    } finally {
      this.running = false;
    }
  }

  private async sweepStaleDevices(): Promise<void> {
    if (Date.now() - this.lastStaleSweep < STALE_SWEEP_INTERVAL_MS) return;
    this.lastStaleSweep = Date.now();
    await this.dataSource.query(
      `UPDATE "push_devices"
       SET "active" = false, "updated_at" = NOW()
       WHERE "active" = true
         AND "last_seen_at" < NOW() - ($1 * INTERVAL '1 day')`,
      [this.staleDeviceDays],
    );
  }

  private async recoverStaleClaims(): Promise<void> {
    await this.dataSource.query(
      `UPDATE "push_deliveries" AS delivery
       SET "status" = 'failed',
           "last_error" = 'Device push registration is inactive',
           "updated_at" = NOW()
       FROM "push_devices" AS device
       WHERE delivery."device_id" = device."id"
         AND device."active" = false
         AND delivery."status" = 'pending'`,
    );
    await this.dataSource.query(
      `UPDATE "push_deliveries"
       SET "status" = CASE WHEN "attempt_count" >= $1 THEN 'failed' ELSE 'pending' END,
           "last_error" = CASE WHEN "attempt_count" >= $1
             THEN 'Delivery worker stopped after the maximum attempts'
             ELSE "last_error" END,
           "updated_at" = NOW()
       WHERE "status" = 'sending'
         AND "updated_at" < NOW() - ($2 * INTERVAL '1 millisecond')`,
      [this.maxAttempts, STALE_CLAIM_MS],
    );
  }

  private async claimBatch(): Promise<ClaimedDelivery[]> {
    const result = (await this.dataSource.query(
      `WITH next_alert AS (
         SELECT "alert_id"
         FROM "push_deliveries"
         WHERE "status" = 'pending'
           AND "attempt_count" < $1
           AND "next_attempt_at" <= NOW()
         ORDER BY "created_at"
         LIMIT 1
       ),
       candidates AS (
         SELECT delivery."id"
         FROM "push_deliveries" AS delivery
         JOIN next_alert ON next_alert."alert_id" = delivery."alert_id"
         JOIN "push_devices" AS device ON device."id" = delivery."device_id"
         WHERE delivery."status" = 'pending'
           AND delivery."attempt_count" < $1
           AND delivery."next_attempt_at" <= NOW()
           AND device."active" = true
         ORDER BY delivery."created_at"
         LIMIT $2
         FOR UPDATE OF delivery SKIP LOCKED
       )
       UPDATE "push_deliveries" AS d
       SET "status" = 'sending',
           "attempt_count" = d."attempt_count" + 1,
           "updated_at" = NOW()
       FROM candidates AS c, "push_devices" AS device, "alerts" AS alert
       WHERE d."id" = c."id"
         AND device."id" = d."device_id"
         AND alert."id" = d."alert_id"
       RETURNING d."id" AS delivery_id,
         device."id" AS device_id, device."token",
         alert."id" AS alert_id,
         COALESCE(d."title", alert."title") AS title,
         COALESCE(d."body", alert."body") AS body,
         COALESCE(d."tier", alert."tier"::text) AS tier,
         d."attempt_count"`,
      [this.maxAttempts, this.batchSize],
    )) as unknown;
    // TypeORM returns [rows, affectedCount] for UPDATE ... RETURNING on Postgres.
    return (
      Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result
    ) as ClaimedDelivery[];
  }

  private async sendBatch(deliveries: ClaimedDelivery[]): Promise<void> {
    if (deliveries.length === 0) return;

    try {
      const result = await this.firebase.send(
        deliveries.map((delivery) => delivery.token),
        {
          id: deliveries[0].alert_id,
          title: deliveries[0].title,
          body: deliveries[0].body,
          tier: deliveries[0].tier,
        },
      );
      await Promise.all(
        result.responses.map(async (response, index) => {
          const delivery = deliveries[index];
          if (response.success) {
            await this.markSent(delivery);
            return;
          }

          const code = response.error?.code ?? 'FCM_SEND_FAILED';
          const invalidToken = INVALID_TOKEN_CODES.has(code);
          if (invalidToken) {
            await this.deactivateDevice(delivery.device_id);
          }
          await this.markFailed(
            delivery,
            code,
            invalidToken || PERMANENT_CODES.has(code),
          );
        }),
      );
    } catch (error) {
      const code = this.errorCode(error);
      await Promise.all(
        deliveries.map((delivery) => this.markFailed(delivery, code, false)),
      );
      this.logger.error(
        `FCM batch failed for ${deliveries.length} delivery job(s): ${code}`,
      );
    }
  }

  private markSent(delivery: ClaimedDelivery): Promise<unknown> {
    return this.dataSource.query(
      `WITH sent AS (
         UPDATE "push_deliveries"
         SET "status" = 'sent', "sent_at" = NOW(), "last_error" = NULL,
             "updated_at" = NOW()
         WHERE "id" = $1
       )
       UPDATE "push_devices"
       SET "last_seen_at" = NOW(), "updated_at" = NOW()
       WHERE "id" = $2`,
      [delivery.delivery_id, delivery.device_id],
    );
  }

  private async markFailed(
    delivery: ClaimedDelivery,
    code: string,
    permanent: boolean,
  ): Promise<void> {
    const terminal = permanent || delivery.attempt_count >= this.maxAttempts;
    const delayMs = Math.min(
      this.retryMaxMs,
      this.retryBaseMs * 2 ** Math.max(0, delivery.attempt_count - 1),
    );
    await this.dataSource.query(
      `UPDATE "push_deliveries"
       SET "status" = $2::text,
           "next_attempt_at" = CASE WHEN $2::text = 'pending'
             THEN NOW() + ($3 * INTERVAL '1 millisecond')
             ELSE "next_attempt_at" END,
           "last_error" = $4,
           "updated_at" = NOW()
       WHERE "id" = $1`,
      [
        delivery.delivery_id,
        terminal ? 'failed' : 'pending',
        delayMs,
        code.slice(0, 200),
      ],
    );
  }

  private deactivateDevice(deviceId: string): Promise<unknown> {
    return this.dataSource.query(
      `UPDATE "push_devices"
       SET "active" = false, "updated_at" = NOW()
       WHERE "id" = $1`,
      [deviceId],
    );
  }

  private errorCode(error: unknown): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string'
    ) {
      return error.code;
    }
    return 'FCM_REQUEST_FAILED';
  }
}
