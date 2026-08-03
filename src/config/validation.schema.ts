import * as Joi from 'joi';

/** Fail fast at boot on a missing or malformed env var, instead of three files
 *  (app wiring, the CLI datasource, .env.example) drifting their own defaults —
 *  DB_PORT's default had already drifted once during scaffolding before this existed. */
export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES: Joi.string().default('12h'),
  GEO_SERVICE_API_KEY: Joi.string().min(32).required(),
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5433),
  DB_USER: Joi.string().default('cryohealth'),
  DB_PASSWORD: Joi.string().default('cryohealth-dev'),
  DB_NAME: Joi.string().default('cryohealth'),
});
