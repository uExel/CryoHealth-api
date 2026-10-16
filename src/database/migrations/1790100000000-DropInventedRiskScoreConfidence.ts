import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * lake_risk_scores.confidence was created as NOT NULL DEFAULT 0.8, so any score
 * written without a confidence silently got 80%. Nothing in this project measures
 * confidence, so that number was invented. The column stays, but is now nullable with
 * no default: null means "no confidence figure", and the API passes that through.
 * Existing rows are left as they are.
 */
export class DropInventedRiskScoreConfidence1790100000000 implements MigrationInterface {
  name = 'DropInventedRiskScoreConfidence1790100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lake_risk_scores" ALTER COLUMN "confidence" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "lake_risk_scores" ALTER COLUMN "confidence" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE "lake_risk_scores" SET "confidence" = 0.8 WHERE "confidence" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "lake_risk_scores" ALTER COLUMN "confidence" SET DEFAULT 0.8`,
    );
    await queryRunner.query(
      `ALTER TABLE "lake_risk_scores" ALTER COLUMN "confidence" SET NOT NULL`,
    );
  }
}
