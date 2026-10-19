/** Single source of truth for runtime config. Read via ConfigService.get('a.b'),
 *  never process.env directly outside this file and database/data-source.ts (the
 *  TypeORM CLI entrypoint, which runs outside Nest's DI and so can't use ConfigService). */
export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigins: process.env.CORS_ORIGINS ?? 'http://localhost:8080',
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES ?? '12h',
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  },
  push: {
    batchSize: Math.min(
      parseInt(process.env.PUSH_BATCH_SIZE ?? '500', 10),
      500,
    ),
    maxAttempts: parseInt(process.env.PUSH_MAX_ATTEMPTS ?? '8', 10),
    retryBaseMs: parseInt(process.env.PUSH_RETRY_BASE_MS ?? '30000', 10),
    retryMaxMs: parseInt(process.env.PUSH_RETRY_MAX_MS ?? '21600000', 10),
    pollIntervalMs: parseInt(process.env.PUSH_POLL_INTERVAL_MS ?? '10000', 10),
    staleDeviceDays: parseInt(process.env.PUSH_STALE_DEVICE_DAYS ?? '60', 10),
  },
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5433', 10),
    username: process.env.DB_USER ?? 'cryohealth',
    password: process.env.DB_PASSWORD ?? 'cryohealth-dev',
    name: process.env.DB_NAME ?? 'cryohealth',
  },
});
