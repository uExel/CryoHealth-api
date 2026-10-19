/**
 * Sends a real FCM push straight to every active registered device — no alert is
 * created and the API/worker are bypassed. Use it to check the phone side
 * (token, network, battery settings). `data.alertId` points at the newest active
 * alert so tapping the notification opens a real alert screen.
 *
 *   npm run push:test                 # all active devices
 *   npm run push:test -- "My title"   # custom title
 */
import 'reflect-metadata';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { firebaseCredentialFromEnv } from '../src/push/firebase-credential';
import dataSource from '../src/database/data-source';

async function main() {
  const credential = firebaseCredentialFromEnv({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY,
  });
  if (!credential) {
    throw new Error(
      'Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.',
    );
  }
  const title = process.argv[2] ?? 'CryoHealth test push';

  await dataSource.initialize();
  const devices = (await dataSource.query(
    `SELECT "token", "platform" FROM "push_devices" WHERE "active" = true`,
  )) as { token: string; platform: string }[];
  const latest = (await dataSource.query(
    `SELECT "id", "tier" FROM "alerts" WHERE "status" = 'active' ORDER BY "createdAt" DESC LIMIT 1`,
  )) as { id: string; tier: string }[];
  await dataSource.destroy();

  if (devices.length === 0) {
    console.log(
      'No active devices. Open the app on the phone so it registers.',
    );
    return;
  }

  const app =
    getApps()[0] ?? initializeApp({ credential: cert(credential) });
  const result = await getMessaging(app).sendEachForMulticast({
    tokens: devices.map((d) => d.token),
    notification: {
      title,
      body: `Test sent ${new Date().toLocaleTimeString()} — tap to open the latest alert.`,
    },
    data: latest[0] ? { alertId: latest[0].id, tier: latest[0].tier } : {},
    android: {
      priority: 'high',
      notification: { channelId: 'hazard-alerts', sound: 'default' },
    },
  });

  result.responses.forEach((r, i) => {
    const who = `${devices[i].platform} ${devices[i].token.slice(0, 10)}…`;
    console.log(
      r.success
        ? `OK   ${who} accepted by FCM`
        : `FAIL ${who} ${r.error?.code}: ${r.error?.message}`,
    );
  });
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
