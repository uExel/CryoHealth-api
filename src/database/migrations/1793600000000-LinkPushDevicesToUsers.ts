import { MigrationInterface, QueryRunner } from 'typeorm';

export class LinkPushDevicesToUsers1793600000000 implements MigrationInterface {
  name = 'LinkPushDevicesToUsers1793600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "push_devices" ADD COLUMN "user_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "push_devices" ADD CONSTRAINT "FK_push_devices_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_push_devices_user_id" ON "push_devices" ("user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_push_devices_user_id"`);
    await queryRunner.query(
      `ALTER TABLE "push_devices" DROP CONSTRAINT "FK_push_devices_user"`,
    );
    await queryRunner.query(`ALTER TABLE "push_devices" DROP COLUMN "user_id"`);
  }
}
