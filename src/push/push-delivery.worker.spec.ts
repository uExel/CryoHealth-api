import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { FirebasePushService } from './firebase-push.service';
import { PushDeliveryWorker } from './push-delivery.worker';

type Row = {
  delivery_id: string;
  device_id: string;
  token: string;
  alert_id: string;
  title: string;
  body: string;
  tier: string;
  attempt_count: number;
};

const row = (n: number, attempt = 1): Row => ({
  delivery_id: `delivery-${n}`,
  device_id: `device-${n}`,
  token: `token-${n}`,
  alert_id: 'alert-1',
  title: 'Lake: tier now RED',
  body: 'body',
  tier: 'red',
  attempt_count: attempt,
});

describe('PushDeliveryWorker', () => {
  let queries: { sql: string; params?: unknown[] }[];
  let claimed: Row[];
  const send = jest.fn();

  const build = () => {
    const dataSource = {
      query: jest.fn((sql: string, params?: unknown[]) => {
        queries.push({ sql, params });
        return Promise.resolve(
          sql.includes('RETURNING d."id"') ? [claimed, claimed.length] : [],
        );
      }),
    };
    const firebase = { send, initialize: jest.fn().mockReturnValue(true) };
    const config = {
      get: (key: string) =>
        ({ 'push.maxAttempts': 3, 'push.batchSize': 500 })[key],
    };
    return new PushDeliveryWorker(
      dataSource as unknown as DataSource,
      firebase as unknown as FirebasePushService,
      config as unknown as ConfigService,
    );
  };

  const updatesWith = (needle: string) =>
    queries.filter((q) => q.sql.includes(needle));

  beforeEach(() => {
    queries = [];
    claimed = [];
    send.mockReset();
  });

  it('marks successful sends as sent and refreshes the device last_seen_at', async () => {
    claimed = [row(1)];
    send.mockResolvedValue({ responses: [{ success: true }] });

    await build().processPending();

    const sent = updatesWith(`"status" = 'sent'`);
    expect(sent).toHaveLength(1);
    expect(sent[0].sql).toContain(`"last_seen_at" = NOW()`);
    expect(sent[0].params).toEqual(['delivery-1', 'device-1']);
  });

  it('deactivates the device and fails terminally on an unregistered token', async () => {
    claimed = [row(1)];
    send.mockResolvedValue({
      responses: [
        {
          success: false,
          error: { code: 'messaging/registration-token-not-registered' },
        },
      ],
    });

    await build().processPending();

    const deactivate = updatesWith(`SET "active" = false`).filter((q) =>
      q.params?.includes('device-1'),
    );
    expect(deactivate).toHaveLength(1);
    const failed = updatesWith(`"next_attempt_at" = CASE`);
    expect(failed[0].params?.[1]).toBe('failed');
  });

  it('does not retry permanent payload errors', async () => {
    claimed = [row(1, 1)];
    send.mockResolvedValue({
      responses: [
        { success: false, error: { code: 'messaging/invalid-argument' } },
      ],
    });

    await build().processPending();

    expect(updatesWith(`"next_attempt_at" = CASE`)[0].params?.[1]).toBe(
      'failed',
    );
  });

  it('schedules a backed-off retry for transient errors', async () => {
    claimed = [row(1, 1)];
    send.mockResolvedValue({
      responses: [
        { success: false, error: { code: 'messaging/server-unavailable' } },
      ],
    });

    await build().processPending();

    const params = updatesWith(`"next_attempt_at" = CASE`)[0].params;
    expect(params?.[1]).toBe('pending');
    expect(params?.[2]).toBe(30_000);
  });

  it('gives up once the configured max attempts is reached', async () => {
    claimed = [row(1, 3)];
    send.mockResolvedValue({
      responses: [
        { success: false, error: { code: 'messaging/server-unavailable' } },
      ],
    });

    await build().processPending();

    expect(updatesWith(`"next_attempt_at" = CASE`)[0].params?.[1]).toBe(
      'failed',
    );
  });

  it('marks the whole batch for retry when the FCM request itself throws', async () => {
    claimed = [row(1), row(2)];
    send.mockRejectedValue(
      Object.assign(new Error('boom'), { code: 'app/network-error' }),
    );

    await build().processPending();

    const failed = updatesWith(`"next_attempt_at" = CASE`);
    expect(failed).toHaveLength(2);
    expect(failed.every((q) => q.params?.[1] === 'pending')).toBe(true);
  });

  it('does not call FCM when nothing is claimable', async () => {
    await build().processPending();
    expect(send).not.toHaveBeenCalled();
  });

  it('sweeps devices that have not been seen within the stale window', async () => {
    await build().processPending();
    const sweep = updatesWith(`"last_seen_at" < NOW()`);
    expect(sweep).toHaveLength(1);
    expect(sweep[0].params).toEqual([60]);
  });
});
