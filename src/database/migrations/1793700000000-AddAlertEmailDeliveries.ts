import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAlertEmailDeliveries1793700000000 implements MigrationInterface {
  name = 'AddAlertEmailDeliveries1793700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "email" character varying`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_users_email_lower" ON "users" (LOWER("email")) WHERE "email" IS NOT NULL`,
    );
    await queryRunner.query(`
      CREATE TABLE "alert_email_deliveries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "alert_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "email" character varying NOT NULL,
        "subject" text NOT NULL,
        "body" text NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "attempt_count" integer NOT NULL DEFAULT 0,
        "next_attempt_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "sent_at" TIMESTAMP WITH TIME ZONE,
        "last_error" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_alert_email_deliveries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_alert_email_deliveries_alert" FOREIGN KEY ("alert_id") REFERENCES "alerts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_alert_email_deliveries_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "uq_alert_email_deliveries_alert_user" UNIQUE ("alert_id", "user_id"),
        CONSTRAINT "chk_alert_email_deliveries_status" CHECK ("status" IN ('pending', 'sending', 'sent', 'failed'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_alert_email_deliveries_pending" ON "alert_email_deliveries" ("status", "next_attempt_at", "created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_alert_email_deliveries_pending"`);
    await queryRunner.query(`DROP TABLE "alert_email_deliveries"`);
    await queryRunner.query(`DROP INDEX "uq_users_email_lower"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email"`);
  }
}
