import { MigrationInterface, QueryRunner } from 'typeorm';

export class ObservationDedupeIndex1785668319315 implements MigrationInterface {
  name = 'ObservationDedupeIndex1785668319315';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_observation_dedupe" ON "observations" ("lakeId", "capturedAt", "source") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_observation_dedupe"`);
  }
}
