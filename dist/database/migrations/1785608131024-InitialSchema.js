"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitialSchema1785608131024 = void 0;
class InitialSchema1785608131024 {
    name = 'InitialSchema1785608131024';
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "observations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "lakeId" uuid NOT NULL, "capturedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "source" character varying NOT NULL DEFAULT 'sentinel2', "areaKm2" numeric(12,6) NOT NULL, "cloudFraction" numeric(5,4), "sceneId" character varying, "runId" character varying NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f9208d64f50a76030758087c0ef" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_fadbaa3cc5fca15221dfca36bb" ON "observations" ("lakeId", "capturedAt") `);
        await queryRunner.query(`CREATE TYPE "public"."dam_type" AS ENUM('moraine', 'bedrock', 'ice', 'unknown')`);
        await queryRunner.query(`CREATE TYPE "public"."tier" AS ENUM('normal', 'watch', 'high', 'critical')`);
        await queryRunner.query(`CREATE TABLE "lakes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "nameUr" character varying, "valley" character varying NOT NULL, "district" character varying NOT NULL, "damType" "public"."dam_type" NOT NULL DEFAULT 'unknown', "glacierContact" boolean NOT NULL DEFAULT false, "icimodId" character varying, "geom" geometry(Point,4326) NOT NULL, "boundary" geometry(Polygon,4326), "elevationM" integer, "historicalGlof" boolean NOT NULL DEFAULT false, "currentTier" "public"."tier" NOT NULL DEFAULT 'normal', "stale" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_725a4ca381cc90f5d6822852184" UNIQUE ("icimodId"), CONSTRAINT "PK_c1a7da735060ab41595c79d66bc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "hazard_scores" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "lakeId" uuid NOT NULL, "runId" character varying NOT NULL, "score" numeric(8,4) NOT NULL, "tier" "public"."tier" NOT NULL, "components" jsonb NOT NULL, "computedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e5db2deed4580d2d8b257249242" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3b976b08fed8a1bc74dcdf3933" ON "hazard_scores" ("lakeId", "computedAt") `);
        await queryRunner.query(`CREATE TABLE "facilities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "type" character varying NOT NULL DEFAULT 'bhu', "district" character varying NOT NULL, "geom" geometry(Point,4326), "contact" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_2e6c685b2e1195e6d6394a22bc7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."role" AS ENUM('cryohealth_admin', 'facility_admin', 'chw', 'viewer')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "role" "public"."role" NOT NULL, "name" character varying NOT NULL, "phone" character varying, "lhwId" character varying, "passwordHash" character varying NOT NULL, "facilityId" uuid, "active" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_a000cca60bcf04454e727699490" UNIQUE ("phone"), CONSTRAINT "UQ_a9a81473ecd02e238fbeb71040e" UNIQUE ("lhwId"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."alert_status" AS ENUM('active', 'cleared')`);
        await queryRunner.query(`CREATE TABLE "alerts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "lakeId" uuid, "tier" "public"."tier" NOT NULL, "title" character varying NOT NULL, "body" text NOT NULL, "windowStart" TIMESTAMP WITH TIME ZONE, "windowEnd" TIMESTAMP WITH TIME ZONE, "downstreamSummary" text, "status" "public"."alert_status" NOT NULL DEFAULT 'active', "issuedById" uuid, "dedupeKey" character varying NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "clearedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_d462ef6348dab8d4a1ad69a144a" UNIQUE ("dedupeKey"), CONSTRAINT "PK_60f895662df096bfcdfab7f4b96" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."sync_state" AS ENUM('queued', 'synced')`);
        await queryRunner.query(`CREATE TABLE "chw_cases" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "chwId" uuid NOT NULL, "capturedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "payload" jsonb NOT NULL, "outcome" character varying, "syncState" "public"."sync_state" NOT NULL DEFAULT 'synced', "deviceId" character varying NOT NULL, "clientCaseId" character varying NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_3acc9b54cb54caea85927a87b33" UNIQUE ("clientCaseId"), CONSTRAINT "PK_51b0484cf5924a529678d847427" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_4fb5b6abb73d4bb142e1675402" ON "chw_cases" ("chwId", "capturedAt") `);
        await queryRunner.query(`CREATE TABLE "sync_log" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "deviceId" character varying NOT NULL, "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "finishedAt" TIMESTAMP WITH TIME ZONE, "itemCount" integer NOT NULL DEFAULT '0', "status" character varying NOT NULL DEFAULT 'ok', "detail" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5a1c2f181ab99c0757868c7d0fc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "audit" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "actorId" uuid, "action" character varying NOT NULL, "entityType" character varying NOT NULL, "entityId" character varying, "reason" text, "meta" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1d3d120ddaf7bc9b1ed68ed463a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "observations" ADD CONSTRAINT "FK_53e7cf2e3f21fa15663145b8a56" FOREIGN KEY ("lakeId") REFERENCES "lakes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "hazard_scores" ADD CONSTRAINT "FK_98d936ac2809014aa39e01b97a0" FOREIGN KEY ("lakeId") REFERENCES "lakes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_a52777ccb99dc7c3a7bbaeb792c" FOREIGN KEY ("facilityId") REFERENCES "facilities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD CONSTRAINT "FK_b7b218b24ef9473a8b7b654e1e9" FOREIGN KEY ("lakeId") REFERENCES "lakes"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "alerts" ADD CONSTRAINT "FK_84b65b600b31ce411f50b0900a8" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chw_cases" ADD CONSTRAINT "FK_02ac278defac47a4cd8b51b75f4" FOREIGN KEY ("chwId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sync_log" ADD CONSTRAINT "FK_0049d69ee32bb18191f6aed04f3" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "audit" ADD CONSTRAINT "FK_0de728fd71d24466b7b4f00f49c" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }
    async down(queryRunner) {
        await queryRunner.query(`ALTER TABLE "audit" DROP CONSTRAINT "FK_0de728fd71d24466b7b4f00f49c"`);
        await queryRunner.query(`ALTER TABLE "sync_log" DROP CONSTRAINT "FK_0049d69ee32bb18191f6aed04f3"`);
        await queryRunner.query(`ALTER TABLE "chw_cases" DROP CONSTRAINT "FK_02ac278defac47a4cd8b51b75f4"`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP CONSTRAINT "FK_84b65b600b31ce411f50b0900a8"`);
        await queryRunner.query(`ALTER TABLE "alerts" DROP CONSTRAINT "FK_b7b218b24ef9473a8b7b654e1e9"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_a52777ccb99dc7c3a7bbaeb792c"`);
        await queryRunner.query(`ALTER TABLE "hazard_scores" DROP CONSTRAINT "FK_98d936ac2809014aa39e01b97a0"`);
        await queryRunner.query(`ALTER TABLE "observations" DROP CONSTRAINT "FK_53e7cf2e3f21fa15663145b8a56"`);
        await queryRunner.query(`DROP TABLE "audit"`);
        await queryRunner.query(`DROP TABLE "sync_log"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4fb5b6abb73d4bb142e1675402"`);
        await queryRunner.query(`DROP TABLE "chw_cases"`);
        await queryRunner.query(`DROP TYPE "public"."sync_state"`);
        await queryRunner.query(`DROP TABLE "alerts"`);
        await queryRunner.query(`DROP TYPE "public"."alert_status"`);
        await queryRunner.query(`DROP TYPE "public"."tier"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."role"`);
        await queryRunner.query(`DROP TABLE "facilities"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3b976b08fed8a1bc74dcdf3933"`);
        await queryRunner.query(`DROP TABLE "hazard_scores"`);
        await queryRunner.query(`DROP TABLE "lakes"`);
        await queryRunner.query(`DROP TYPE "public"."dam_type"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fadbaa3cc5fca15221dfca36bb"`);
        await queryRunner.query(`DROP TABLE "observations"`);
    }
}
exports.InitialSchema1785608131024 = InitialSchema1785608131024;
//# sourceMappingURL=1785608131024-InitialSchema.js.map