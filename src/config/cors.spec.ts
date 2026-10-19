import configuration from './configuration';
import { parseCorsOrigins } from './cors';

describe('parseCorsOrigins', () => {
  it('splits a comma-separated list and trims spaces', () => {
    expect(
      parseCorsOrigins('http://localhost:8080, https://cryohealth.io ,'),
    ).toEqual(['http://localhost:8080', 'https://cryohealth.io']);
  });

  it('returns an empty list when nothing is set', () => {
    expect(parseCorsOrigins(undefined)).toEqual([]);
    expect(parseCorsOrigins('')).toEqual([]);
  });
});

describe('CORS_ORIGINS through the config loader', () => {
  const saved = process.env.CORS_ORIGINS;
  afterEach(() => {
    if (saved === undefined) delete process.env.CORS_ORIGINS;
    else process.env.CORS_ORIGINS = saved;
  });

  it('allows exactly the origins set in CORS_ORIGINS, not a hardcoded list', () => {
    process.env.CORS_ORIGINS =
      'https://dash.example.org, http://localhost:3001';
    expect(parseCorsOrigins(configuration().corsOrigins)).toEqual([
      'https://dash.example.org',
      'http://localhost:3001',
    ]);
  });

  it('falls back to the website and local dev origins when unset', () => {
    delete process.env.CORS_ORIGINS;
    expect(parseCorsOrigins(configuration().corsOrigins)).toEqual([
      'http://localhost:8080',
      'https://cryohealth.io',
    ]);
  });
});
