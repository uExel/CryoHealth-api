import { MigrationInterface, QueryRunner } from 'typeorm';

export class GlacierRgiUniqueAndSourceUrl1791283685914 implements MigrationInterface {
  name = 'GlacierRgiUniqueAndSourceUrl1791283685914';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "glaciers" ADD COLUMN IF NOT EXISTS "source_url" text`,
    );
    // Partial: curated records with no RGI v7.0 match keep rgi_id NULL (see
    // src/glaciers/data/glaciers.seed-data.ts). Lets seed-glaciers upsert ON CONFLICT.
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_glaciers_rgi_id" ON "glaciers" ("rgi_id") WHERE "rgi_id" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_glaciers_rgi_id"`);
    await queryRunner.query(
      `ALTER TABLE "glaciers" DROP COLUMN IF EXISTS "source_url"`,
    );
  }
}
