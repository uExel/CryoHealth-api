import { PushQueueService } from './push-queue.service';

describe('PushQueueService', () => {
  it('routes lake alerts only to active devices owned by mapped downstream users', async () => {
    const manager = { query: jest.fn().mockResolvedValue(undefined) };

    await new PushQueueService().enqueueAlert(
      manager as unknown as import('typeorm').EntityManager,
      'alert-1',
    );

    const [query, params] = manager.query.mock.calls[0] as [string, string[]];
    expect(params).toEqual(['alert-1']);
    expect(query).toContain('u."id" = d."user_id"');
    expect(query).toContain('u."active" = true');
    expect(query).toContain(`u."role" IN ('chw', 'facility_admin')`);
    expect(query).toContain('f."lakeId" = a."lakeId"');
    expect(query).toContain('a."lakeId" IS NULL');
    expect(query).toContain('d."active" = true');
  });
});
