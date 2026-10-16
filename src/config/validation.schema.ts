import * as Joi from 'joi';

/** Fail fast at boot on a missing or malformed env var, instead of three files
 *  (app wiring, the CLI datasource, .env.example) drifting their own defaults —
 *  DB_PORT's default had already drifted once during scaffolding before this existed. */
export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  CORS_ORIGINS: Joi.string().default(
    'http://localhost:8081,http://localhost:19006',
  ),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES: Joi.string().default('12h'),
  GEO_SERVICE_API_KEY: Joi.string().min(32).required(),
  FIREBASE_PROJECT_ID: Joi.string().min(1).when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  FIREBASE_CLIENT_EMAIL: Joi.string().min(1).when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  FIREBASE_PRIVATE_KEY: Joi.string().min(1).when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  PUSH_BATCH_SIZE: Joi.number().integer().min(1).max(500).default(500),
  PUSH_MAX_ATTEMPTS: Joi.number().integer().min(1).default(8),
  PUSH_RETRY_BASE_MS: Joi.number().integer().min(1000).default(30000),
  PUSH_RETRY_MAX_MS: Joi.number().integer().min(1000).default(21600000),
  PUSH_POLL_INTERVAL_MS: Joi.number().integer().min(1000).default(10000),
  PUSH_STALE_DEVICE_DAYS: Joi.number().integer().min(1).default(60),
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5433),
  DB_USER: Joi.string().default('cryohealth'),
  DB_PASSWORD: Joi.string().default('cryohealth-dev'),
  DB_NAME: Joi.string().default('cryohealth'),
});
