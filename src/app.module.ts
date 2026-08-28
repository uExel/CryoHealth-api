import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DistrictsModule } from './districts/districts.module';
import { FacilitiesModule } from './facilities/facilities.module';
import { HealthModule } from './health/health.module';
import { LakesModule } from './lakes/lakes.module';
import { AlertsModule } from './alerts/alerts.module';
import { CasesModule } from './cases/cases.module';
import { GlaciersModule } from './glaciers/glaciers.module';
import { ProtocolsModule } from './protocols/protocols.module';
import { ChwProfilesModule } from './chw-profiles/chw-profiles.module';
import { KpisModule } from './kpis/kpis.module';
import { AuditModule } from './audit/audit.module';
import { SyncModule } from './sync/sync.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    DistrictsModule,
    FacilitiesModule,
    HealthModule,
    LakesModule,
    AlertsModule,
    CasesModule,
    GlaciersModule,
    ProtocolsModule,
    ChwProfilesModule,
    KpisModule,
    AuditModule,
    SyncModule,
  ],
  providers: [
    // Order matters: auth resolves req.user first, then role membership is checked.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
