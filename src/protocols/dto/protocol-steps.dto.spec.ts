import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProtocolDto } from './create-protocol.dto';

const VALID_STEP = {
  label: 'STEP 1',
  head: 'head',
  why: 'why',
  tier: 'normal',
};

const BASE_PAYLOAD = {
  slug: 'x',
  title: 'x',
  category: 'x',
  body: 'x',
  source: 'x',
};

async function errorsFor(steps: unknown) {
  const instance = plainToInstance(CreateProtocolDto, {
    ...BASE_PAYLOAD,
    steps,
  });
  return validate(instance);
}

describe('CreateProtocolDto.steps validation', () => {
  it('accepts a well-formed steps object', async () => {
    const errors = await errorsFor({ chw: [VALID_STEP], pub: [VALID_STEP] });
    expect(errors).toHaveLength(0);
  });

  it('rejects an out-of-range tier', async () => {
    const errors = await errorsFor({
      chw: [{ ...VALID_STEP, tier: 'EXTREME' }],
      pub: [VALID_STEP],
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a step with a missing tier', async () => {
    const { tier: _tier, ...stepWithoutTier } = VALID_STEP;
    const errors = await errorsFor({
      chw: [stepWithoutTier],
      pub: [VALID_STEP],
    });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects chw as a non-array', async () => {
    const errors = await errorsFor({ chw: 'not-an-array', pub: [VALID_STEP] });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects steps as a plain string', async () => {
    const errors = await errorsFor('not-an-object');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects an empty steps object', async () => {
    const errors = await errorsFor({});
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects steps missing pub', async () => {
    const errors = await errorsFor({ chw: [VALID_STEP] });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects steps missing chw', async () => {
    const errors = await errorsFor({ pub: [VALID_STEP] });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects a bare array in place of the steps object', async () => {
    const errors = await errorsFor([VALID_STEP]);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects empty chw/pub arrays', async () => {
    const errors = await errorsFor({ chw: [], pub: [] });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('allows steps to be omitted entirely (nullable on the entity)', async () => {
    const errors = await errorsFor(undefined);
    expect(errors).toHaveLength(0);
  });
});
