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
