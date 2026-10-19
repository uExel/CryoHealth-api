import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPushDevicesAndDeliveries1791890000000 implements MigrationInterface {
  name = 'AddPushDevicesAndDeliveries1791890000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "push_devices" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "token" text NOT NULL,
        "platform" character varying NOT NULL,
        "active" boolean NOT NULL DEFAULT true,
        "last_seen_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_push_devices" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_push_devices_token" ON "push_devices" ("token")`,
    );
    await queryRunner.query(`
      CREATE TABLE "push_deliveries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "alert_id" uuid NOT NULL,
        "device_id" uuid NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "attempt_count" integer NOT NULL DEFAULT 0,
        "next_attempt_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "sent_at" TIMESTAMP WITH TIME ZONE,
        "last_error" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_push_deliveries" PRIMARY KEY ("id"),
        CONSTRAINT "FK_push_deliveries_alert" FOREIGN KEY ("alert_id")
          REFERENCES "alerts"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_push_deliveries_device" FOREIGN KEY ("device_id")
          REFERENCES "push_devices"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_push_deliveries_alert_device" ON "push_deliveries" ("alert_id", "device_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_push_deliveries_pending" ON "push_deliveries" ("status", "next_attempt_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "push_deliveries"`);
    await queryRunner.query(`DROP TABLE "push_devices"`);
  }
}
