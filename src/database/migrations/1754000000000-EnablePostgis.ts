import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnablePostgis1754000000000 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.query('CREATE EXTENSION IF NOT EXISTS postgis');
  }
  public async down(q: QueryRunner): Promise<void> {
    await q.query('DROP EXTENSION IF EXISTS postgis');
  }
}
