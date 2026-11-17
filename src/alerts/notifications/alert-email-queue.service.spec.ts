import { EntityManager } from 'typeorm';
import { Logger } from '@nestjs/common';
import { AlertEmailQueueService } from './alert-email-queue.service';

describe('AlertEmailQueueService', () => {
  it('queues one email per active mapped CHW and warns when email is missing', async () => {
    const manager = {
      query: jest.fn().mockResolvedValue([{ count: 1 }]),
    };
    const service = new AlertEmailQueueService();
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    await service.enqueueAlert(manager as unknown as EntityManager, 'alert-1');

    const [insert, insertParams] = manager.query.mock.calls[0] as [
      string,
      string[],
    ];
    expect(insertParams).toEqual(['alert-1']);
    expect(insert).toContain(`u."role" = 'chw'`);
    expect(insert).toContain(`u."email" IS NOT NULL`);
    expect(insert).toContain(`f."lakeId" = a."lakeId"`);
    expect(insert).toContain(`ON CONFLICT ("alert_id", "user_id") DO UPDATE`);
    expect(insert).toContain(`a."estimated_window"`);
    expect(insert).toContain(`a."downstreamSummary"`);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('without an email address'),
    );
    warn.mockRestore();
  });
});
