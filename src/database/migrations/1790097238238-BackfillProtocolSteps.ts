import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Data migration, not schema. `scripts/seed-dev-data.ts` is dev-only by design (its own
 * header: "never run against a real deployment") and the deploy pipeline
 * (.github/workflows/deploy.yml) only ever runs `seed-glaciers.ts` -- so the `steps`
 * content added to seed-dev-data.ts for these two protocols (cryohealth-app#5's fix
 * loop) would never reach production through the normal deploy path. Encoding it as a
 * migration instead means it runs wherever `migration:run` runs, which deploy.sh does.
 *
 * Safe to run against a database where these rows don't exist yet (WHERE slug = ...
 * matches zero rows, no-op) or where they already have steps set (idempotent
 * overwrite with the same content).
 */
export class BackfillProtocolSteps1790097238238 implements MigrationInterface {
  name = 'BackfillProtocolSteps1790097238238';

  private static readonly PNEUMONIA_STEPS = {
    chw: [
      {
        label: 'STEP 1 · DANGER SIGNS',
        head: 'No general danger signs',
        why: 'Able to drink · no vomiting · no convulsions · not lethargic',
        tier: 'normal',
      },
      {
        label: 'STEP 2 · CLASSIFICATION',
        head: 'Fast breathing — pneumonia',
        why: '44 breaths/min at age 2 (cut-off 40)',
        tier: 'high',
      },
      {
        label: 'STEP 3 · DO THIS',
        head: 'Amoxicillin 250 mg — 1 tablet twice daily, 5 days',
        why: 'Dose row: 2 years / 10–14 kg. Continue feeding and fluids.',
        tier: 'normal',
        numbered: true,
      },
      {
        label: 'STEP 4 · REFER IF',
        head: 'Chest indrawing, unable to drink, or worse in 2 days',
        why: 'Refer to Hassanabad BHU — mark the case for follow-up.',
        tier: 'critical',
      },
    ],
    pub: [
      {
        label: 'WHAT THIS MAY BE',
        head: 'Possible chest infection',
        why: 'Fast breathing in a young child needs a health worker today.',
        tier: 'watch',
      },
      {
        label: 'DO THIS NOW',
        head: 'Go to Hassanabad BHU today',
        why: 'Keep the child warm. Keep giving fluids and feeding.',
        tier: 'normal',
        numbered: true,
      },
      {
        label: 'GO IMMEDIATELY IF',
        head: 'Cannot drink, chest pulls in, or the child is limp',
        why: 'These are danger signs. Do not wait.',
        tier: 'critical',
      },
    ],
  };

  private static readonly GLOF_STEP = (head: string) => ({
    label: 'STEP',
    head,
    why: 'This warning may not have made a sound if your phone is silent.',
    tier: 'critical',
    numbered: true,
  });

  private static readonly GLOF_STEPS = {
    chw: [
      BackfillProtocolSteps1790097238238.GLOF_STEP(
        'Move people and animals above the flood mark',
      ),
      BackfillProtocolSteps1790097238238.GLOF_STEP(
        'Fill clean water containers now',
      ),
      BackfillProtocolSteps1790097238238.GLOF_STEP(
        'Keep the KKH bridge route clear for rescue',
      ),
    ],
    pub: [
      BackfillProtocolSteps1790097238238.GLOF_STEP(
        'Move people and animals above the flood mark',
      ),
      BackfillProtocolSteps1790097238238.GLOF_STEP(
        'Fill clean water containers now',
      ),
      BackfillProtocolSteps1790097238238.GLOF_STEP(
        'Keep the KKH bridge route clear for rescue',
      ),
    ],
  };

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE protocols SET steps = $1::jsonb, source = $2
       WHERE slug = 'fast-breathing-pneumonia-2y'`,
      [
        JSON.stringify(BackfillProtocolSteps1790097238238.PNEUMONIA_STEPS),
        'WHO IMCI chart booklet · LHW curriculum',
      ],
    );

    await queryRunner.query(
      `UPDATE protocols SET steps = $1::jsonb, source = $2
       WHERE slug = 'glof-evacuation-checklist'`,
      [
        JSON.stringify(BackfillProtocolSteps1790097238238.GLOF_STEPS),
        'GLOF early-warning evacuation guidance',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverts steps to null (the pre-#19 state) and source back to the file-path-leaking
    // strings this migration replaced -- exact prior values, not a guess.
    await queryRunner.query(
      `UPDATE protocols SET steps = NULL,
         source = 'WHO IMCI chart booklet · LHW curriculum (transcribed from CryoHealth-app src/lib/mock.ts GUIDANCE.chw)'
       WHERE slug = 'fast-breathing-pneumonia-2y'`,
    );

    await queryRunner.query(
      `UPDATE protocols SET steps = NULL,
         source = 'Transcribed from CryoHealth-app src/lib/mock.ts ALERT_DETAIL.checklist'
       WHERE slug = 'glof-evacuation-checklist'`,
    );
  }
}
