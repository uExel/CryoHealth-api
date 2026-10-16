import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { firebaseCredentialFromEnv } from './firebase-credential';

@Injectable()
export class FirebasePushService {
  private readonly logger = new Logger(FirebasePushService.name);
  private messaging?: Messaging;

  constructor(private readonly config: ConfigService) {}

  initialize(): boolean {
    if (this.messaging) return true;

    const credential = firebaseCredentialFromEnv({
      projectId: this.config.get<string>('firebase.projectId'),
      clientEmail: this.config.get<string>('firebase.clientEmail'),
      privateKey: this.config.get<string>('firebase.privateKey'),
    });
    if (!credential) {
      this.logger.warn(
        'FCM delivery is disabled: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are not configured.',
      );
      return false;
    }

    const app: App =
      getApps()[0] ?? initializeApp({ credential: cert(credential) });
    this.messaging = getMessaging(app);
    this.logger.log('Firebase Admin push delivery is initialized.');
    return true;
  }

  async send(
    tokens: string[],
    alert: { id: string; title: string; body: string; tier: string },
  ) {
    if (!this.messaging) {
      throw new Error('Firebase Admin was not initialized before sending.');
    }
    if (tokens.length === 0 || tokens.length > 500) {
      throw new Error('FCM multicast requests must contain 1 to 500 tokens.');
    }

    return this.messaging.sendEachForMulticast({
      tokens,
      notification: { title: alert.title, body: alert.body },
      data: { alertId: alert.id, tier: alert.tier },
      android: {
        priority: 'high',
        notification: { channelId: 'hazard-alerts', sound: 'default' },
      },
      apns: {
        headers: { 'apns-priority': '10' },
        payload: { aps: { sound: 'default' } },
      },
    });
  }
}
