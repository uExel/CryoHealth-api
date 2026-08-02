import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLakeSlugAndSource1785657630650 implements MigrationInterface {
  name = 'AddLakeSlugAndSource1785657630650';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "lakes" ADD "slug" character varying NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "lakes" ADD CONSTRAINT "UQ_3e4dcf48c0eeef0d135932dd36d" UNIQUE ("slug")`,
    );
    await queryRunner.query(`ALTER TABLE "lakes" ADD "source" text NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "lakes" ADD "sourceUrl" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "lakes" DROP COLUMN "sourceUrl"`);
    await queryRunner.query(`ALTER TABLE "lakes" DROP COLUMN "source"`);
    await queryRunner.query(
      `ALTER TABLE "lakes" DROP CONSTRAINT "UQ_3e4dcf48c0eeef0d135932dd36d"`,
    );
    await queryRunner.query(`ALTER TABLE "lakes" DROP COLUMN "slug"`);
  }
}
