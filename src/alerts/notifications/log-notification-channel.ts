import { Injectable, Logger } from '@nestjs/common';
import { Alert } from '../entities/alert.entity';
import { AlertRecipient, NotificationChannel } from './notification-channel';

/** Logs the mapped health-worker recipients for operations; FCM delivery is queued per device. */
@Injectable()
export class LogNotificationChannel implements NotificationChannel {
  readonly kind = 'log';
  private readonly logger = new Logger(LogNotificationChannel.name);

  async send(alert: Alert, recipients: AlertRecipient[]): Promise<void> {
    const names =
      recipients.map((r) => r.name).join(', ') || 'no mapped recipients';
    this.logger.log(
      `[RECIPIENTS] alert ${alert.id} (${alert.tier}, "${alert.title}") -> ${recipients.length} mapped health-worker recipient(s): ${names}`,
    );
    await Promise.resolve();
  }
}
