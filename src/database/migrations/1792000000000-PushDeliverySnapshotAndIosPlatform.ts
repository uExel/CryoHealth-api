import { MigrationInterface, QueryRunner } from 'typeorm';

export class PushDeliverySnapshotAndIosPlatform1792000000000 implements MigrationInterface {
  name = 'PushDeliverySnapshotAndIosPlatform1792000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "push_deliveries"
        ADD COLUMN "title" text,
        ADD COLUMN "body" text,
        ADD COLUMN "tier" character varying
    `);
    await queryRunner.query(`
      UPDATE "push_deliveries" AS d
      SET "title" = a."title", "body" = a."body", "tier" = a."tier"
      FROM "alerts" AS a
      WHERE a."id" = d."alert_id"
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_push_devices_active_last_seen" ON "push_devices" ("active", "last_seen_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_push_devices_active_last_seen"`);
    await queryRunner.query(`
      ALTER TABLE "push_deliveries"
        DROP COLUMN "title", DROP COLUMN "body", DROP COLUMN "tier"
    `);
  }
}
