import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds tables and columns needed by the cryohealth web frontend.
 * The frontend now queries this DB directly (via postgres.js server functions)
 * instead of Supabase. Existing CryoHealth-api tables are extended with new
 * nullable columns; the new tables provide supplementary data.
 */
export class WebSchema1785700000000 implements MigrationInterface {
  name = 'WebSchema1785700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Districts ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "districts" (
        "id"           uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "name"         text        NOT NULL,
        "province"     text        NOT NULL DEFAULT 'Gilgit Baltistan',
        "population"   integer,
        "centroid_lat" double precision,
        "centroid_lng" double precision,
        "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_districts" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_districts_name" UNIQUE ("name")
      )
    `);

    // ── Extend lakes ─────────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "lakes" ADD COLUMN IF NOT EXISTS "district_id" uuid REFERENCES "districts"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "lakes" ADD COLUMN IF NOT EXISTS "current_risk_score" numeric NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "lakes" ADD COLUMN IF NOT EXISTS "downstream_population" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "lakes" ADD COLUMN IF NOT EXISTS "area_km2" numeric`,
    );

    // ── Extend alerts ────────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "district_id" uuid REFERENCES "districts"("id") ON DELETE SET NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "body_en" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "body_ur" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "estimated_window" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" ADD COLUMN IF NOT EXISTS "affected_population" integer NOT NULL DEFAULT 0`,
    );
    // Backfill body_en from existing body column
    await queryRunner.query(
      `UPDATE "alerts" SET "body_en" = "body" WHERE "body_en" IS NULL`,
    );

    // ── Extend facilities ────────────────────────────────────────────────────
    await queryRunner.query(
      `ALTER TABLE "facilities" ADD COLUMN IF NOT EXISTS "vulnerability" text NOT NULL DEFAULT 'low'`,
    );

    // ── Protocols ────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "protocols" (
        "id"         uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "slug"       text        NOT NULL,
        "title"      text        NOT NULL,
        "category"   text        NOT NULL,
        "body"       text        NOT NULL,
        "source"     text        NOT NULL DEFAULT 'WHO IMNCI',
        "is_disaster" boolean    NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_protocols" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_protocols_slug" UNIQUE ("slug")
      )
    `);

    // ── Glaciers ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "glaciers" (
        "id"               uuid             NOT NULL DEFAULT uuid_generate_v4(),
        "name"             text             NOT NULL,
        "rgi_id"           text,
        "glims_id"         text,
        "district_id"      uuid             REFERENCES "districts"("id") ON DELETE SET NULL,
        "lat"              double precision NOT NULL,
        "lng"              double precision NOT NULL,
        "area_km2"         numeric,
        "length_km"        numeric,
        "elevation_min_m"  integer,
        "elevation_max_m"  integer,
        "status"           text             NOT NULL DEFAULT 'unknown',
        "terminus_type"    text,
        "source"           text,
        "last_observed"    text,
        "notes"            text,
        "created_at"       TIMESTAMPTZ      NOT NULL DEFAULT now(),
        CONSTRAINT "PK_glaciers" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_glaciers_district" ON "glaciers"("district_id")`,
    );

    // ── Glacier observations ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "glacier_observations" (
        "id"                uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "glacier_id"        uuid        NOT NULL REFERENCES "glaciers"("id") ON DELETE CASCADE,
        "observed_at"       TIMESTAMPTZ NOT NULL,
        "area_km2"          numeric,
        "length_km"         numeric,
        "terminus_change_m" numeric,
        "status"            text,
        "source"            text,
        "notes"             text,
        "created_at"        TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_glacier_observations" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_glacier_obs_glacier_time" ON "glacier_observations"("glacier_id", "observed_at" DESC)`,
    );

    // ── CHW profiles ─────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "chw_profiles" (
        "id"          uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"     uuid        REFERENCES "users"("id") ON DELETE CASCADE,
        "full_name"   text        NOT NULL DEFAULT 'Community Health Worker',
        "district_id" uuid        REFERENCES "districts"("id") ON DELETE SET NULL,
        "phone"       text,
        "language"    text        NOT NULL DEFAULT 'ur',
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_chw_profiles" PRIMARY KEY ("id")
      )
    `);

    // ── Cases ────────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cases" (
        "id"                 uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "chw_id"             uuid        NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
        "district_id"        uuid        REFERENCES "districts"("id") ON DELETE SET NULL,
        "patient_age"        integer,
        "patient_sex"        text,
        "symptoms"           text        NOT NULL,
        "diagnosis"          text,
        "treatment"          text,
        "outcome"            text,
        "is_disaster_related" boolean   NOT NULL DEFAULT false,
        "created_at"         TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_cases" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_cases_chw" ON "cases"("chw_id", "created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_cases_district" ON "cases"("district_id", "created_at" DESC)`,
    );

    // ── Alert acknowledgements ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "alert_acknowledgements" (
        "id"              uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "alert_id"        uuid        NOT NULL REFERENCES "alerts"("id") ON DELETE CASCADE,
        "chw_id"          uuid        NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "acknowledged_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_alert_acknowledgements" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_ack_alert_chw" UNIQUE ("alert_id", "chw_id")
      )
    `);

    // ── Lake risk scores ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lake_risk_scores" (
        "id"          uuid        NOT NULL DEFAULT uuid_generate_v4(),
        "lake_id"     uuid        NOT NULL REFERENCES "lakes"("id") ON DELETE CASCADE,
        "score"       numeric     NOT NULL,
        "tier"        text        NOT NULL,
        "confidence"  numeric     NOT NULL DEFAULT 0.8,
        "source"      text        NOT NULL DEFAULT 'sentinel-1',
        "observed_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_lake_risk_scores" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_risk_lake_time" ON "lake_risk_scores"("lake_id", "observed_at" DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "lake_risk_scores"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "alert_acknowledgements"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cases"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "chw_profiles"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "glacier_observations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "glaciers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "protocols"`);
    await queryRunner.query(
      `ALTER TABLE "facilities" DROP COLUMN IF EXISTS "vulnerability"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" DROP COLUMN IF EXISTS "affected_population"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" DROP COLUMN IF EXISTS "estimated_window"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" DROP COLUMN IF EXISTS "body_ur"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" DROP COLUMN IF EXISTS "body_en"`,
    );
    await queryRunner.query(
      `ALTER TABLE "alerts" DROP COLUMN IF EXISTS "district_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lakes" DROP COLUMN IF EXISTS "area_km2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lakes" DROP COLUMN IF EXISTS "downstream_population"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lakes" DROP COLUMN IF EXISTS "current_risk_score"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lakes" DROP COLUMN IF EXISTS "district_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "districts"`);
  }
}
