/** Single source of truth for runtime config. Read via ConfigService.get('a.b'),
 *  never process.env directly outside this file and database/data-source.ts (the
 *  TypeORM CLI entrypoint, which runs outside Nest's DI and so can't use ConfigService). */
export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES ?? '12h',
  },
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5433', 10),
    username: process.env.DB_USER ?? 'cryohealth',
    password: process.env.DB_PASSWORD ?? 'cryohealth-dev',
    name: process.env.DB_NAME ?? 'cryohealth',
  },
});
