import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertEmailDelivery } from '../entities/alert-email-delivery.entity';
import { AlertEmailQueueService } from './alert-email-queue.service';
import { AlertEmailWorker } from './alert-email.worker';
import { SmtpEmailService } from './smtp-email.service';

@Module({
  imports: [TypeOrmModule.forFeature([AlertEmailDelivery])],
  providers: [AlertEmailQueueService, AlertEmailWorker, SmtpEmailService],
  exports: [AlertEmailQueueService],
})
export class AlertEmailModule {}
