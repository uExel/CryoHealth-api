import { Alert } from '../entities/alert.entity';

export type AlertRecipient = {
  userId: string;
  name: string;
  /** How to reach them on this channel — a phone number for push (device token lookup
   *  happens downstream, not modeled yet), an email address for email, etc. */
  address: string;
};

/** One delivery channel. Multiple implementations fan out from the same alert —
 *  in-app is the DB row itself (GET /alerts), this interface is for push/email/etc. */
export interface NotificationChannel {
  readonly kind: string;
  send(alert: Alert, recipients: AlertRecipient[]): Promise<void>;
}

export const NOTIFICATION_CHANNELS = 'NOTIFICATION_CHANNELS';
