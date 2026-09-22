import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProtocolSteps1790093553705 implements MigrationInterface {
  name = 'AddProtocolSteps1790093553705';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "protocols" ADD COLUMN IF NOT EXISTS "steps" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "protocols" DROP COLUMN IF EXISTS "steps"`,
    );
  }
}
