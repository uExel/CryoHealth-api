import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { Alert } from '../alerts/entities/alert.entity';
import { PushDelivery } from './entities/push-delivery.entity';
import { PushDevice } from './entities/push-device.entity';
import { FirebasePushService } from './firebase-push.service';
import { PushDeliveryWorker } from './push-delivery.worker';
import { PushDeliveriesController } from './push-deliveries.controller';
import { PushDeliveriesService } from './push-deliveries.service';
import { PushDevicesController } from './push-devices.controller';
import { PushDevicesService } from './push-devices.service';
import { PushQueueService } from './push-queue.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Alert, PushDevice, PushDelivery]),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 30 }]),
  ],
  controllers: [PushDevicesController, PushDeliveriesController],
  providers: [
    PushDeliveriesService,
    FirebasePushService,
    PushDeliveryWorker,
    PushDevicesService,
    PushQueueService,
  ],
  exports: [PushQueueService],
})
export class PushModule {}
