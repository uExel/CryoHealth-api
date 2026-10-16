import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * lakes.downstream_population was created as NOT NULL DEFAULT 0, so a lake created
 * without a population figure was stored as "0 people downstream" — which reads as
 * safe, not unknown. The column is now nullable with no default: null means "no
 * figure". Existing rows are left as they are; the API already reports a stored 0 as
 * null (NULLIF), so nothing changes for them.
 */
export class MakeLakeDownstreamPopulationNullable1790100000001 implements MigrationInterface {
  name = 'MakeLakeDownstreamPopulationNullable1790100000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lakes" ALTER COLUMN "downstream_population" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "lakes" ALTER COLUMN "downstream_population" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "lakes" SET "downstream_population" = 0 WHERE "downstream_population" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "lakes" ALTER COLUMN "downstream_population" SET DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "lakes" ALTER COLUMN "downstream_population" SET NOT NULL`,
    );
  }
}
