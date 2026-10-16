import { Alert } from '../entities/alert.entity';

export type AlertRecipient = {
  userId: string;
  name: string;
  /** Contact information used by this channel; FCM delivery uses push_devices tokens. */
  address: string;
};

/** Legacy recipient logging channel. Durable FCM jobs are queued separately per device. */
export interface NotificationChannel {
  readonly kind: string;
  send(alert: Alert, recipients: AlertRecipient[]): Promise<void>;
}

export const NOTIFICATION_CHANNELS = 'NOTIFICATION_CHANNELS';
