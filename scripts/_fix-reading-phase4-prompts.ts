/**
 * Fix script 1: Reading phase4 items — rename 'question' → 'prompt' in content
 * Also renames 'passageId' → 'moduleId' for consistency.
 *
 * Affects: all READING items tagged 'seed-reading-phase4' where content has 'question' but no 'prompt'
 *
 * npx tsx scripts/_fix-reading-phase4-prompts.ts
 * DRY_RUN=1 npx tsx scripts/_fix-reading-phase4-prompts.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const items = await p.item.findMany({
    where: { status: 'ACTIVE', skill: 'READING', tags: { has: 'seed-reading-phase4' } },
    select: { id: true, content: true, tags: true }
  });

  const toFix = items.filter(i => {
    const c = i.content as any;
    return c && c.question && !c.prompt;
  });

  console.log(`Found ${toFix.length} reading items to fix (question → prompt)`);

  if (process.env.DRY_RUN === '1') {
    console.log('DRY_RUN: no changes made.');
    for (const i of toFix.slice(0, 5)) {
      const c = i.content as any;
      console.log(`  id=${i.id} question="${String(c.question).slice(0, 80)}"`);
    }
    return;
  }

  let fixed = 0;
  for (const item of toFix) {
    const c = item.content as Record<string, any>;
    const updated: Record<string, any> = {};
    for (const [k, v] of Object.entries(c)) {
      if (k === 'question') {
        updated['prompt'] = v; // rename
      } else if (k === 'passageId') {
        updated['moduleId'] = v; // rename passageId → moduleId
        updated['passageId'] = v; // keep both for backward compat
      } else {
        updated[k] = v;
      }
    }
    await p.item.update({ where: { id: item.id }, data: { content: updated } });
    fixed++;
    if (fixed % 20 === 0) console.log(`  ... fixed ${fixed}/${toFix.length}`);
  }

  console.log(`\n✅ Fixed ${fixed} reading items (question → prompt)`);
  await p.$disconnect();
}

main().catch(e => { console.error(e); p.$disconnect(); process.exit(1); });
