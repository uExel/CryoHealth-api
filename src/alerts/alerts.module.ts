import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { Facility } from '../database/entities/facility.entity';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { Alert } from './entities/alert.entity';
import { AuditEntry } from './entities/audit-entry.entity';
import { HazardScore } from './entities/hazard-score.entity';
import { LogNotificationChannel } from './notifications/log-notification-channel';
import { NOTIFICATION_CHANNELS } from './notifications/notification-channel';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alert, HazardScore, AuditEntry, Facility]),
    UsersModule,
  ],
  controllers: [AlertsController],
  providers: [
    AlertsService,
    LogNotificationChannel,
    {
      provide: NOTIFICATION_CHANNELS,
      useFactory: (log: LogNotificationChannel) => [log],
      inject: [LogNotificationChannel],
    },
  ],
})
export class AlertsModule {}
