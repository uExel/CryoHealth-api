import { Injectable, Logger } from '@nestjs/common';
import { Alert } from '../entities/alert.entity';
import { AlertRecipient, NotificationChannel } from './notification-channel';

/**
 * The only channel wired up right now. No FCM or email provider is configured anywhere
 * in this project — this logs exactly what would have been sent, to whom, rather than
 * pretending to deliver it. Swapping in real push/email later means adding a class that
 * implements NotificationChannel and listing it alongside this one in AlertsModule; it
 * does not touch AlertsService. See ADR 0003.
 */
@Injectable()
export class LogNotificationChannel implements NotificationChannel {
  readonly kind = 'log';
  private readonly logger = new Logger(LogNotificationChannel.name);

  async send(alert: Alert, recipients: AlertRecipient[]): Promise<void> {
    const names =
      recipients.map((r) => r.name).join(', ') || 'no mapped recipients';
    this.logger.log(
      `[STUB] alert ${alert.id} (${alert.tier}, "${alert.title}") -> ${recipients.length} recipient(s): ${names}`,
    );
    await Promise.resolve();
  }
}
