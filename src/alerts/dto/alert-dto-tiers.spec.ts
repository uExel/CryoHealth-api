import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TIERS } from '../../common/types/tier.type';
import { UpdateAlertDto } from './admin-alert.dto';
import { IssueAlertDto } from './issue-alert.dto';
import { OverrideAlertDto } from './override-alert.dto';
import { RecordHazardScoreDto } from './record-hazard-score.dto';

const LAKE_ID = '11111111-1111-4111-8111-111111111111';

/** Each alert DTO validates `tier` against the shared TIERS list. A valid body for
 *  each DTO, with only `tier` varied. */
const cases = [
  {
    name: 'UpdateAlertDto',
    cls: UpdateAlertDto,
    body: (tier: unknown) => ({ tier }),
  },
  {
    name: 'IssueAlertDto',
    cls: IssueAlertDto,
    body: (tier: unknown) => ({
      lakeId: LAKE_ID,
      tier,
      title: 't',
      body: 'b',
      reason: 'r',
    }),
  },
  {
    name: 'OverrideAlertDto',
    cls: OverrideAlertDto,
    body: (tier: unknown) => ({ tier, reason: 'r' }),
  },
  {
    name: 'RecordHazardScoreDto',
    cls: RecordHazardScoreDto,
    body: (tier: unknown) => ({
      lakeId: LAKE_ID,
      runId: 'run-1',
      score: 0.5,
      tier,
      components: {},
    }),
  },
];

const tierErrors = async (cls: new () => object, body: object) =>
  (await validate(plainToInstance(cls, body))).filter(
    (e) => e.property === 'tier',
  );

describe('alert DTO tier validation', () => {
  it('the shared TIERS list is the four known tiers, lowest to highest', () => {
    expect([...TIERS]).toEqual(['normal', 'watch', 'high', 'critical']);
  });

  describe.each(cases)('$name', ({ cls, body }) => {
    it.each([...TIERS])('accepts tier %s', async (tier) => {
      expect(await tierErrors(cls, body(tier))).toHaveLength(0);
    });

    it.each(['severe', 'HIGH', '', 'unknown'])(
      'rejects tier %j',
      async (tier) => {
        expect(await tierErrors(cls, body(tier))).toHaveLength(1);
      },
    );

    it('rejects a non-string tier', async () => {
      expect(await tierErrors(cls, body(3))).toHaveLength(1);
    });
  });
});
