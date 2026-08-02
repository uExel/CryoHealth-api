import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlertDedupeAndFacilityLake1785659144273 implements MigrationInterface {
  name = 'AlertDedupeAndFacilityLake1785659144273';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "alerts" DROP CONSTRAINT "UQ_d462ef6348dab8d4a1ad69a144a"`,
    );
    await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN "dedupeKey"`);
    await queryRunner.query(`ALTER TABLE "facilities" ADD "lakeId" uuid`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_alert_active_lake_tier" ON "alerts" ("lakeId", "tier") WHERE "status" = 'active'`,
    );
    await queryRunner.query(
      `ALTER TABLE "facilities" ADD CONSTRAINT "FK_50c8ed311eb5a1c273c2b9d458f" FOREIGN KEY ("lakeId") REFERENCES "lakes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "facilities" DROP CONSTRAINT "FK_50c8ed311eb5a1c273c2b9d458f"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_alert_active_lake_tier"`);
    await queryRunner.query(`ALTER TABLE "facilities" DROP COLUMN "lakeId"`);
    await queryRunner.query(
      `ALTER TABLE "alerts" ADD "dedupeKey" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" ADD CONSTRAINT "UQ_d462ef6348dab8d4a1ad69a144a" UNIQUE ("dedupeKey")`,
    );
  }
}
