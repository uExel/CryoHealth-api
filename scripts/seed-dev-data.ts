/**
 * Idempotent dev-data seed for the tables `seed-lakes.ts` and `seed-users.ts` don't
 * cover: districts, glaciers, protocols, alerts, alert acknowledgements, facilities,
 * cases. Local dev / visual-testing only — never run against a real deployment.
 *
 * Provenance discipline follows `src/lakes/data/lakes.seed-data.ts` (see decision
 * 2026-08-02: fabricated coordinates/measurements presented as real inventory data are
 * a credibility and safety problem for a GLOF early-warning system, not an acceptable
 * shortcut). Column-by-column:
 *
 *  - districts: name + province only (real, well-known GB districts). `population` and
 *    `centroid_lat/lng` are left NULL — no cited source for this seed, and no query in
 *    either consuming repo reads them today.
 *  - glaciers: name + lat/lng reuse the exact coordinates and citations already vetted
 *    in `lakes.seed-data.ts` for the correspondingly-named glacier (that file cites a
 *    real source per lake). `area_km2`, `length_km`, `elevation_min_m`,
 *    `elevation_max_m` are left NULL — no measured figures were sourced for this seed.
 *  - glacier_observations, lake_risk_scores: intentionally NOT seeded. A fabricated
 *    time series here is indistinguishable from real CryoHealth-geo pipeline output —
 *    exactly the failure mode the decision doc warns about. Needs real Sentinel-1/2
 *    pipeline runs, not synthetic seed rows.
 *  - protocols: transcribed verbatim from CryoHealth-app's `src/lib/mock.ts`
 *    (`GUIDANCE.chw`/`.pub` -> `steps`, `ALERT_DETAIL`/`CRITICAL` -> `body`) —
 *    team-authored design-reference content, not generated here. Per workspace
 *    CLAUDE.md, dosing/diagnosis text must never come from a language model; this
 *    script copies, it does not compose. `glof-evacuation-checklist` has no `steps`:
 *    its source (`ALERT_DETAIL.checklist`) is flat strings with no per-item tier/why
 *    split to transcribe, so `body` (already clean) stays its only content.
 *  - alerts: also transcribed from `mock.ts`'s `ALERTS`/`ALERT_DETAIL`. `lakes.currentTier`
 *    is deliberately left untouched — that column is tier *policy* output owned by
 *    CryoHealth-api's alert service, not something a seed script should set. The
 *    CRITICAL-tier row needed to visually verify the red-reserved-for-CRITICAL design
 *    rule comes from this alert, not from forcing a lake's tier.
 *  - facilities: one real, named facility referenced in `mock.ts` ("Hassanabad BHU").
 *    No cited coordinate for this seed, so `geom` is left NULL — it will not appear on
 *    the hazard-map facility layer (`listFacilities` filters `WHERE geom IS NOT NULL`)
 *    until a real surveyed point is added.
 *  - cases: synthetic demo patient records. Explicitly the safe kind of fake — the
 *    dashboard already banners "Case and health records shown are sample data", and
 *    no real patient is represented.
 */
import 'reflect-metadata';
import dataSource from '../src/database/data-source';

const DISTRICTS = [
  { name: 'Hunza', province: 'Gilgit Baltistan' },
  { name: 'Ghizer', province: 'Gilgit Baltistan' },
];

// lat/lng + source copied from src/lakes/data/lakes.seed-data.ts's entry for the
// correspondingly-named lake — same citation, not independently verified here.
const GLACIERS = [
  {
    name: 'Hassanabad glacier (Shishper)',
    district: 'Hunza',
    lat: 36.4,
    lng: 74.61,
    source:
      'Ali et al., "Formation of a hazardous ice-dammed glacier lake: a case study of anomalous behavior of Hassanabad glacier system in the Karakoram", Discover Applied Sciences (Springer Nature), 2020 — https://link.springer.com/article/10.1007/s42452-020-2989-4',
  },
  {
    name: 'Khurdopin glacier',
    district: 'Hunza',
    lat: 36.3383,
    lng: 75.5083,
    source:
      '"Brief communication: The Khurdopin glacier surge revisited – extreme flow velocities and formation of a dammed lake in 2017", The Cryosphere (Copernicus), 2018 — https://tc.copernicus.org/articles/12/95/2018/',
  },
  {
    name: 'Badswat glacier (G1/G2)',
    district: 'Ghizer',
    lat: 36.4855,
    lng: 74.0775,
    source:
      'Midpoint of glacier IDs G074052E36491N/G074103E36480N cited in "Determining the Events in a Glacial Disaster Chain at Badswat Glacier in the Karakoram Range Using Remote Sensing" — https://www.researchgate.net/publication/350183638',
  },
  {
    name: 'Passu Glacier',
    district: 'Hunza',
    lat: 36.47,
    lng: 74.77,
    source:
      'Wikipedia: Passu Glacier — https://en.wikipedia.org/wiki/Passu_Glacier',
  },
  {
    name: 'Ghulkin Glacier',
    district: 'Hunza',
    lat: 36.4653,
    lng: 74.856,
    source:
      'AikQaum geographic profile of Ghulkin Glacier — https://aikqaum.com/ghulkin-glacier-a-natural-wonder-in-the-karakoram-range-of-pakistan/',
  },
  {
    name: 'Batura Glacier',
    district: 'Hunza',
    lat: 36.53,
    lng: 74.65,
    source:
      'Wikipedia: Batura Glacier — https://en.wikipedia.org/wiki/Batura_Glacier',
  },
] as const;

// Transcribed from CryoHealth-app/src/lib/mock.ts GUIDANCE.chw and CRITICAL/ALERT_DETAIL.
const PROTOCOLS = [
  {
    slug: 'fast-breathing-pneumonia-2y',
    title: 'Fast breathing — pneumonia (child ~2 years)',
    category: 'IMCI · Respiratory',
    body: [
      'STEP 1 · DANGER SIGNS: No general danger signs — able to drink, no vomiting, no convulsions, not lethargic.',
      'STEP 2 · CLASSIFICATION: Fast breathing — pneumonia (44 breaths/min at age 2; cut-off 40).',
      'STEP 3 · DO THIS: Amoxicillin 250 mg — 1 tablet twice daily, 5 days. Dose row: 2 years / 10-14 kg. Continue feeding and fluids.',
      'STEP 4 · REFER IF: Chest indrawing, unable to drink, or worse in 2 days. Refer to Hassanabad BHU — mark the case for follow-up.',
    ].join('\n'),
    source:
      'WHO IMCI chart booklet · LHW curriculum (transcribed from CryoHealth-app src/lib/mock.ts GUIDANCE.chw)',
    isDisaster: false,
    // Verbatim from CryoHealth-app/src/lib/mock.ts GUIDANCE.chw/.pub (field `n` -> `label`
    // per the API's ProtocolStep shape, cryohealth-app#5). No text composed here.
    steps: JSON.stringify({
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
    }),
  },
  {
    slug: 'glof-evacuation-checklist',
    title: 'GLOF evacuation — immediate actions',
    category: 'GLOF · Evacuation',
    body: [
      'Move people and animals above the flood mark.',
      'Fill clean water containers now.',
      'Keep the KKH bridge route clear for rescue.',
    ].join('\n'),
    source:
      'Transcribed from CryoHealth-app src/lib/mock.ts ALERT_DETAIL.checklist',
    isDisaster: true,
    // No steps: mock.ts's checklist is flat strings with no per-item tier/why split to
    // transcribe — inventing one would compose structure that isn't in the source text.
    // The app's body-line fallback (cryohealth-app#5 Step 7) renders this correctly as-is.
    steps: null,
  },
] as const;

async function main() {
  await dataSource.initialize();
  try {
    let districtsUpserted = 0;
    for (const d of DISTRICTS) {
      await dataSource.query(
        `INSERT INTO districts (name, province) VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET province = EXCLUDED.province`,
        [d.name, d.province],
      );
      districtsUpserted++;
    }
    await dataSource.query(
      `UPDATE lakes SET district_id = d.id FROM districts d WHERE lakes.district = d.name AND lakes.district_id IS NULL`,
    );
    console.log(
      `districts: ${districtsUpserted} upserted; lakes.district_id backfilled`,
    );

    let glaciersInserted = 0;
    let glaciersSkipped = 0;
    for (const g of GLACIERS) {
      const existing = await dataSource.query(
        `SELECT id FROM glaciers WHERE name = $1`,
        [g.name],
      );
      if (existing.length > 0) {
        glaciersSkipped++;
        continue;
      }
      await dataSource.query(
        `INSERT INTO glaciers (name, district_id, lat, lng, source)
         SELECT $1, d.id, $2, $3, $4 FROM districts d WHERE d.name = $5`,
        [g.name, g.lat, g.lng, g.source, g.district],
      );
      glaciersInserted++;
    }
    console.log(
      `glaciers: ${glaciersInserted} inserted, ${glaciersSkipped} already present`,
    );

    let protocolsUpserted = 0;
    for (const p of PROTOCOLS) {
      await dataSource.query(
        `INSERT INTO protocols (slug, title, category, body, source, is_disaster, steps)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (slug) DO UPDATE SET
           title = EXCLUDED.title, category = EXCLUDED.category, body = EXCLUDED.body,
           source = EXCLUDED.source, is_disaster = EXCLUDED.is_disaster,
           steps = EXCLUDED.steps`,
        [p.slug, p.title, p.category, p.body, p.source, p.isDisaster, p.steps],
      );
      protocolsUpserted++;
    }
    console.log(`protocols: ${protocolsUpserted} upserted`);

    const [admin] = await dataSource.query(
      `SELECT id FROM users WHERE "lhwId" = 'admin-001'`,
    );
    const [chw] = await dataSource.query(
      `SELECT id FROM users WHERE "lhwId" = 'chw-001'`,
    );
    if (!admin || !chw) {
      throw new Error(
        'Expected admin-001 and chw-001 users — run `npm run seed:users` first.',
      );
    }

    const [existingFacility] = await dataSource.query(
      `SELECT id FROM facilities WHERE name = $1`,
      ['Hassanabad BHU'],
    );
    if (!existingFacility) {
      await dataSource.query(
        `INSERT INTO facilities (name, type, district, vulnerability) VALUES ($1, $2, $3, $4)`,
        ['Hassanabad BHU', 'bhu', 'Hunza', 'high'],
      );
      console.log(
        'facilities: 1 inserted (Hassanabad BHU, no geom — needs a surveyed point)',
      );
    } else {
      console.log('facilities: Hassanabad BHU already present');
    }

    // Transcribed from CryoHealth-app/src/lib/mock.ts ALERTS + ALERT_DETAIL.
    const [shishper] = await dataSource.query(
      `SELECT id FROM lakes WHERE slug = 'shishper'`,
    );
    const [khurdopin] = await dataSource.query(
      `SELECT id FROM lakes WHERE slug = 'khurdopin'`,
    );
    const [hunza] = await dataSource.query(
      `SELECT id FROM districts WHERE name = 'Hunza'`,
    );

    const ALERTS = [
      {
        lakeId: shishper.id,
        tier: 'critical',
        title: 'Shishper Lake outburst likely tonight',
        body: 'Sentinel-1 imagery (4 Aug) indicates high confidence of an imminent outburst from the Hassanabad ice-dammed lake. Move to high ground — this warning may not have made a sound if your phone is silent.',
        estimatedWindow: '18:00 – 02:00',
        chips: JSON.stringify(['Impact 18:00–02:00', 'Move to high ground']),
        checklist: JSON.stringify([
          'Move people and animals above the flood mark',
          'Fill clean water containers now',
          'Keep the KKH bridge route clear for rescue',
        ]),
        status: 'active',
        createdAgo: '2 hours',
      },
      {
        lakeId: shishper.id,
        tier: 'high',
        title: 'Meltwater surge in Hassanabad',
        body: 'Meltwater surge observed in Hassanabad nala. Avoid the nala 12:00-18:00 daily until this clears.',
        estimatedWindow: '12:00 – 18:00 daily',
        chips: JSON.stringify(['Avoid the nala 12:00–18:00 daily']),
        checklist: null,
        status: 'active',
        createdAgo: '1 day',
      },
      {
        lakeId: khurdopin.id,
        tier: 'watch',
        title: 'Khurdopin drainage slowing',
        body: 'Khurdopin glacial lake drainage has slowed. Monitoring continues; no immediate action needed.',
        estimatedWindow: null,
        chips: JSON.stringify([]),
        checklist: null,
        status: 'cleared',
        createdAgo: '3 days',
      },
    ] as const;

    let alertsInserted = 0;
    let alertsSkipped = 0;
    for (const a of ALERTS) {
      const [existing] = await dataSource.query(
        `SELECT id FROM alerts WHERE title = $1`,
        [a.title],
      );
      if (existing) {
        alertsSkipped++;
        continue;
      }
      const rows = await dataSource.query(
        `INSERT INTO alerts (
           "lakeId", district_id, tier, title, body, body_en, estimated_window,
           affected_population, chips, checklist, status, "issuedById",
           "createdAt", "clearedAt"
         )
         VALUES ($1,$2,$3,$4,$5,$5,$6,0,$7,$8,$9::alert_status,$10, now() - $11::interval,
           CASE WHEN $9::alert_status = 'cleared' THEN now() - $11::interval + interval '1 day' ELSE NULL END)
         RETURNING id`,
        [
          a.lakeId,
          hunza.id,
          a.tier,
          a.title,
          a.body,
          a.estimatedWindow,
          a.chips,
          a.checklist,
          a.status,
          admin.id,
          a.createdAgo,
        ],
      );
      alertsInserted++;
      if (a.title === 'Meltwater surge in Hassanabad') {
        await dataSource.query(
          `INSERT INTO alert_acknowledgements (alert_id, chw_id) VALUES ($1, $2)
           ON CONFLICT (alert_id, chw_id) DO NOTHING`,
          [rows[0].id, chw.id],
        );
      }
    }
    console.log(
      `alerts: ${alertsInserted} inserted, ${alertsSkipped} already present`,
    );

    const [{ count: caseCount }] = await dataSource.query(
      `SELECT count(*)::int FROM cases WHERE chw_id = $1`,
      [chw.id],
    );
    if (Number(caseCount) === 0) {
      const CASES = [
        {
          age: 2,
          sex: 'M',
          symptoms: 'Child breathing fast, age 2 years',
          diagnosis: 'Fast breathing — pneumonia (IMCI classification)',
          treatment:
            'Amoxicillin per IMCI dose row; continue feeding and fluids',
          outcome: 'Referred to Hassanabad BHU for follow-up',
          disaster: false,
        },
        {
          age: 34,
          sex: 'F',
          symptoms: 'Watery diarrhoea, 3 days',
          diagnosis: null,
          treatment: 'ORS, continued feeding',
          outcome: 'Improving, follow-up in 2 days',
          disaster: false,
        },
        {
          age: 5,
          sex: 'M',
          symptoms: 'Fever 3 days',
          diagnosis: null,
          treatment: null,
          outcome: 'Referred',
          disaster: false,
        },
        {
          age: 45,
          sex: 'F',
          symptoms: 'Minor lacerations during evacuation from Hassanabad nala',
          diagnosis: 'Superficial wound',
          treatment: 'Cleaned and dressed',
          outcome: 'Discharged',
          disaster: true,
        },
      ] as const;
      for (const c of CASES) {
        await dataSource.query(
          `INSERT INTO cases (chw_id, district_id, patient_age, patient_sex, symptoms, diagnosis, treatment, outcome, is_disaster_related)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [
            chw.id,
            hunza.id,
            c.age,
            c.sex,
            c.symptoms,
            c.diagnosis,
            c.treatment,
            c.outcome,
            c.disaster,
          ],
        );
      }
      console.log(`cases: ${CASES.length} inserted`);
    } else {
      console.log(`cases: ${caseCount} already present for chw-001, skipped`);
    }
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
