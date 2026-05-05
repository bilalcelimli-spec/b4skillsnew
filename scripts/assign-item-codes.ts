/**
 * assign-item-codes.ts
 * -------------------------------------------------------------------
 * Assigns a unique, human-readable itemCode to every Item that doesn't
 * have one yet.
 *
 * Format:  {SKILL_ABBREV}-{CEFR}-{SEQNUM:04d}
 * Examples: VOC-B1-0042   GRM-A2-0007   LST-C1-0003
 *
 * Skill abbreviations:
 *   VOCABULARY → VOC   GRAMMAR → GRM   LISTENING → LST
 *   READING    → RDG   WRITING → WRT   SPEAKING  → SPK
 *
 * CEFR kept as-is (A1, A2, B1, B2, C1, C2) except PRE_A1 → PA1
 *
 * Sequence numbers are assigned per (skill, cefr) bucket and start at 1.
 * Items are ordered by createdAt ASC so numbering is stable across re-runs.
 * Already-coded items are skipped, so the script is safe to run repeatedly.
 *
 * Usage:
 *   npx ts-node --esm scripts/assign-item-codes.ts
 *   # or via tsx:
 *   npx tsx scripts/assign-item-codes.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SKILL_ABBREV: Record<string, string> = {
  VOCABULARY: 'VOC',
  GRAMMAR:    'GRM',
  LISTENING:  'LST',
  READING:    'RDG',
  WRITING:    'WRT',
  SPEAKING:   'SPK',
};

function cefrAbbrev(cefr: string): string {
  if (cefr === 'PRE_A1') return 'PA1';
  return cefr; // A1, A2, B1, B2, C1, C2 already fine
}

async function main() {
  // Fetch all items without a code, sorted by skill / cefr / createdAt
  const items = await prisma.item.findMany({
    where: { itemCode: null },
    select: { id: true, skill: true, cefrLevel: true, createdAt: true },
    orderBy: [{ skill: 'asc' }, { cefrLevel: 'asc' }, { createdAt: 'asc' }],
  });

  if (items.length === 0) {
    console.log('All items already have codes. Nothing to do.');
    return;
  }

  // Build a counter per (skill, cefr) bucket seeded from existing codes
  const existingCodes = await prisma.item.findMany({
    where: { itemCode: { not: null } },
    select: { itemCode: true },
  });

  const counters: Record<string, number> = {};
  for (const { itemCode } of existingCodes) {
    if (!itemCode) continue;
    // e.g. "VOC-B1-0042" → bucket "VOC-B1", max seq 42
    const parts = itemCode.split('-');
    if (parts.length < 3) continue;
    const bucket = parts.slice(0, -1).join('-');  // "VOC-B1"
    const seq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(seq)) {
      counters[bucket] = Math.max(counters[bucket] ?? 0, seq);
    }
  }

  console.log(`Assigning codes to ${items.length} items…`);

  let assigned = 0;
  for (const item of items) {
    const skillAbbr = SKILL_ABBREV[item.skill] ?? item.skill.slice(0, 3).toUpperCase();
    const cefrAbbr  = cefrAbbrev(item.cefrLevel);
    const bucket    = `${skillAbbr}-${cefrAbbr}`;

    counters[bucket] = (counters[bucket] ?? 0) + 1;
    const seq = counters[bucket];
    const itemCode = `${bucket}-${String(seq).padStart(4, '0')}`;

    await prisma.item.update({
      where: { id: item.id },
      data: { itemCode },
    });

    if (assigned % 100 === 0) {
      process.stdout.write(`  ${assigned}/${items.length}\r`);
    }
    assigned++;
  }

  console.log(`\nDone. Assigned ${assigned} item codes.`);

  // Print a summary
  const summary = await prisma.item.groupBy({
    by: ['skill', 'cefrLevel'],
    _count: { id: true },
    orderBy: [{ skill: 'asc' }, { cefrLevel: 'asc' }],
  });
  console.log('\nItems per skill / CEFR:');
  for (const row of summary) {
    const abbr = SKILL_ABBREV[row.skill] ?? row.skill;
    console.log(`  ${abbr}-${row.cefrLevel}: ${row._count.id}`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
