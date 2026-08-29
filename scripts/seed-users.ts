/**
 * Idempotent dev-login seed — upserts by lhwId. Not for production use: passwords are
 * fixed dev PINs, only meant to give the mobile app and manual testing something to
 * log in with. Safe to re-run (matches seed-lakes.ts's philosophy).
 */
import 'reflect-metadata';
import { hash } from 'bcryptjs';
import dataSource from '../src/database/data-source';

const DEV_USERS = [
  { lhwId: 'chw-001', name: 'Amina Baig', role: 'chw', pin: '1234' },
  {
    lhwId: 'admin-001',
    name: 'Cryo Admin',
    role: 'cryohealth_admin',
    pin: '1234',
  },
  {
    lhwId: 'facility-001',
    name: 'Facility Admin',
    role: 'facility_admin',
    pin: '1234',
  },
  {
    lhwId: '03002222222',
    name: 'Test User',
    role: 'cryohealth_admin',
    pin: 'testpass123',
    phone: '03002222222',
  },
] as const;

async function main() {
  await dataSource.initialize();
  try {
    let inserted = 0;
    let updated = 0;
    for (const u of DEV_USERS) {
      const passwordHash = await hash(u.pin, 10);
      const result = await dataSource.query(
        `INSERT INTO users ("lhwId", name, role, "passwordHash", active, phone)
         VALUES ($1,$2,$3,$4,true,$5)
         ON CONFLICT ("lhwId") DO UPDATE SET
           name = EXCLUDED.name,
           role = EXCLUDED.role,
           "passwordHash" = EXCLUDED."passwordHash",
           active = true,
           phone = EXCLUDED.phone
         RETURNING (xmax = 0) AS inserted`,
        [u.lhwId, u.name, u.role, passwordHash, u.phone ?? null],
      );
      if (result[0]?.inserted) inserted++;
      else updated++;
    }
    console.log(`Seeded users: ${inserted} inserted, ${updated} updated.`);
    console.log('Dev logins (lhwId / PIN):');
    for (const u of DEV_USERS) console.log(`  ${u.lhwId} / ${u.pin} (${u.role})`);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
