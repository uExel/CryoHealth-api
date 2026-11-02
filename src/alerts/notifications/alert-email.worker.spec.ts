import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { AlertEmailWorker } from './alert-email.worker';
import { SmtpEmailService } from './smtp-email.service';

describe('AlertEmailWorker', () => {
  it('sends pending alert email and marks delivery sent', async () => {
    const delivery = {
      id: 'delivery-1',
      email: 'chw@example.test',
      subject: '[HIGH] Lake warning',
      body: 'Move to high ground.',
      attempt_count: 1,
    };
    const dataSource = {
      query: jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce([[delivery], 1])
        .mockResolvedValueOnce(undefined),
    };
    const email = {
      isConfigured: jest.fn().mockReturnValue(true),
      send: jest.fn().mockResolvedValue(undefined),
    };
    const config = {
      get: jest.fn().mockReturnValue(undefined),
    };
    const worker = new AlertEmailWorker(
      dataSource as unknown as DataSource,
      email as unknown as SmtpEmailService,
      config as unknown as ConfigService,
    );

    await worker.processPending();

    expect(email.send).toHaveBeenCalledWith({
      to: 'chw@example.test',
      subject: '[HIGH] Lake warning',
      text: 'Move to high ground.',
    });
    expect(dataSource.query).toHaveBeenLastCalledWith(
      expect.stringContaining(`"status" = 'sent'`),
      ['delivery-1'],
    );
  });

  it('does not process a queue without SMTP configuration', async () => {
    const dataSource = { query: jest.fn() };
    const email = { isConfigured: jest.fn().mockReturnValue(false) };
    const worker = new AlertEmailWorker(
      dataSource as unknown as DataSource,
      email as unknown as SmtpEmailService,
      { get: jest.fn() } as unknown as ConfigService,
    );

    await worker.processPending();
    expect(dataSource.query).not.toHaveBeenCalled();
  });
});
