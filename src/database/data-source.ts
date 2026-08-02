import 'dotenv/config';
import { DataSource } from 'typeorm';
import { entities } from './all-entities';

/** CLI datasource for migrations (npm run migration:run/generate). App wiring is in
 *  DatabaseModule. This file runs outside Nest's DI container, so it reads process.env
 *  directly rather than through ConfigService — the one place that's correct to do. */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5433),
  username: process.env.DB_USER ?? 'cryohealth',
  password: process.env.DB_PASSWORD ?? 'cryohealth-dev',
  database: process.env.DB_NAME ?? 'cryohealth',
  entities,
  migrations: ['src/database/migrations/*.ts'],
});
