import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { SmtpEmailService } from './smtp-email.service';

const STALE_CLAIM_MS = 2 * 60 * 1000;

type ClaimedEmail = {
  id: string;
  email: string;
  subject: string;
  body: string;
  attempt_count: number;
};

@Injectable()
export class AlertEmailWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AlertEmailWorker.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly batchSize: number;
  private readonly maxAttempts: number;
  private readonly retryBaseMs: number;
  private readonly retryMaxMs: number;
  private readonly pollIntervalMs: number;

  constructor(
    private readonly dataSource: DataSource,
    private readonly email: SmtpEmailService,
    config: ConfigService,
  ) {
    this.batchSize = config.get<number>('email.batchSize') ?? 50;
    this.maxAttempts = config.get<number>('email.maxAttempts') ?? 8;
    this.retryBaseMs = config.get<number>('email.retryBaseMs') ?? 30_000;
    this.retryMaxMs = config.get<number>('email.retryMaxMs') ?? 21_600_000;
    this.pollIntervalMs = config.get<number>('email.pollIntervalMs') ?? 10_000;
  }

  onModuleInit(): void {
    if (!this.email.isConfigured()) {
      this.logger.error(
        'EMAIL DELIVERY DISABLED — SMTP_HOST and SMTP_FROM must be configured; queued alert emails will remain pending.',
      );
      return;
    }

    this.timer = setInterval(() => void this.tick(), this.pollIntervalMs);
    void this.tick();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async processPending(): Promise<void> {
    if (!this.email.isConfigured() || this.running) return;
    this.running = true;
    try {
      await this.recoverStaleClaims();
      const deliveries = await this.claimBatch();
      for (const delivery of deliveries) {
        await this.sendOne(delivery);
      }
    } finally {
      this.running = false;
    }
  }

  private async tick(): Promise<void> {
    try {
      await this.processPending();
    } catch (error) {
      this.logger.error(
        `Email worker cycle failed: ${this.errorMessage(error)}`,
      );
    }
  }

  private async recoverStaleClaims(): Promise<void> {
    await this.dataSource.query(
      `UPDATE "alert_email_deliveries"
       SET "status" = CASE WHEN "attempt_count" >= $1 THEN 'failed' ELSE 'pending' END,
           "last_error" = CASE WHEN "attempt_count" >= $1
             THEN 'Email worker stopped after the maximum attempts'
             ELSE "last_error" END,
           "updated_at" = NOW()
       WHERE "status" = 'sending'
         AND "updated_at" < NOW() - ($2 * INTERVAL '1 millisecond')`,
      [this.maxAttempts, STALE_CLAIM_MS],
    );
  }

  private async claimBatch(): Promise<ClaimedEmail[]> {
    const result = (await this.dataSource.query(
      `WITH candidates AS (
         SELECT "id"
         FROM "alert_email_deliveries"
         WHERE "status" = 'pending'
           AND "attempt_count" < $1
           AND "next_attempt_at" <= NOW()
         ORDER BY "created_at"
         LIMIT $2
         FOR UPDATE SKIP LOCKED
       )
       UPDATE "alert_email_deliveries" AS delivery
       SET "status" = 'sending',
           "attempt_count" = delivery."attempt_count" + 1,
           "updated_at" = NOW()
       FROM candidates
       WHERE delivery."id" = candidates."id"
       RETURNING delivery."id", delivery."email", delivery."subject",
         delivery."body", delivery."attempt_count"`,
      [this.maxAttempts, this.batchSize],
    )) as unknown;
    return (
      Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result
    ) as ClaimedEmail[];
  }

  private async sendOne(delivery: ClaimedEmail): Promise<void> {
    try {
      await this.email.send({
        to: delivery.email,
        subject: delivery.subject,
        text: delivery.body,
      });
      await this.dataSource.query(
        `UPDATE "alert_email_deliveries"
         SET "status" = 'sent', "sent_at" = NOW(), "last_error" = NULL,
             "updated_at" = NOW()
         WHERE "id" = $1`,
        [delivery.id],
      );
    } catch (error) {
      const message = this.errorMessage(error);
      const delay = Math.min(
        this.retryBaseMs * 2 ** Math.max(delivery.attempt_count - 1, 0),
        this.retryMaxMs,
      );
      const nextAttemptAt = new Date(Date.now() + delay);
      await this.dataSource.query(
        `UPDATE "alert_email_deliveries"
         SET "status" = CASE WHEN "attempt_count" >= $2 THEN 'failed' ELSE 'pending' END,
             "last_error" = $3,
             "next_attempt_at" = $4,
             "updated_at" = NOW()
         WHERE "id" = $1`,
        [delivery.id, this.maxAttempts, message, nextAttemptAt],
      );
      this.logger.error(
        `Email delivery ${delivery.id} failed on attempt ${delivery.attempt_count}: ${message}`,
      );
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
