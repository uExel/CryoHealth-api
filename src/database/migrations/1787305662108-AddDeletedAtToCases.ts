import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeletedAtToCases1787305662108 implements MigrationInterface {
  name = 'AddDeletedAtToCases1787305662108';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "cases"
            ADD COLUMN "deleted_at" TIMESTAMPTZ NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "cases"
            DROP COLUMN "deleted_at"
        `);
  }
}
