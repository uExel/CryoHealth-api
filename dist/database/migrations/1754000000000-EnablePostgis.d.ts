import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class EnablePostgis1754000000000 implements MigrationInterface {
    up(q: QueryRunner): Promise<void>;
    down(q: QueryRunner): Promise<void>;
}
