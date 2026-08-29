import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProtocolUpdatedAtAndFacilityColumns1787400000000 implements MigrationInterface {
  name = 'AddProtocolUpdatedAtAndFacilityColumns1787400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "protocols" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()`,
    );

    await queryRunner.query(
      `ALTER TABLE "facilities" ADD COLUMN IF NOT EXISTS "vulnerability" text NOT NULL DEFAULT 'low'`,
    );

    await queryRunner.query(
      `ALTER TABLE "facilities" ADD COLUMN IF NOT EXISTS "lakeId" uuid`,
    );

    await queryRunner.query(
      `ALTER TABLE "glaciers" ALTER COLUMN "last_observed" TYPE timestamptz USING "last_observed"::timestamptz`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "glaciers" ALTER COLUMN "last_observed" TYPE text USING "last_observed"::text`,
    );
    await queryRunner.query(
      `ALTER TABLE "facilities" DROP COLUMN IF EXISTS "lakeId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "facilities" DROP COLUMN IF EXISTS "vulnerability"`,
    );
    await queryRunner.query(
      `ALTER TABLE "protocols" DROP COLUMN IF EXISTS "updated_at"`,
    );
  }
}
