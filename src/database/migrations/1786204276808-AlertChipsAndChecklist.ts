import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `chips` (short action tags) and `checklist` (numbered action items) to alerts,
 * so the mobile app's alert card and critical screen can render real, human-authored
 * content instead of the app's static mock.ts placeholders. Nullable and unbackfilled
 * on purpose: existing alerts get no chips/checklist rather than invented ones.
 */
export class AlertChipsAndChecklist1786204276808 implements MigrationInterface {
  name = 'AlertChipsAndChecklist1786204276808';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "chips" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "checklist" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN IF EXISTS "checklist"`);
    await queryRunner.query(`ALTER TABLE "alerts" DROP COLUMN IF EXISTS "chips"`);
  }
}
