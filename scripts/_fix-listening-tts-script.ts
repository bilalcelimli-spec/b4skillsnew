/**
 * Fix script 2: Listening items — copy 'passage' → 'ttsScript' where ttsScript is missing.
 *
 * The audio generator (generate-listening-audio-gemini.ts) reads content.ttsScript to produce audio.
 * Newer seed phases (26, 27, 28 etc.) stored the transcript as 'passage' without a separate ttsScript.
 * This script copies passage → ttsScript so the audio generator can work.
 *
 * npx tsx scripts/_fix-listening-tts-script.ts
 * DRY_RUN=1 npx tsx scripts/_fix-listening-tts-script.ts
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const items = await p.item.findMany({
    where: { status: 'ACTIVE', skill: 'LISTENING' },
    select: { id: true, content: true }
  });

  const toFix = items.filter(i => {
    const c = i.content as any;
    return c && c.passage && !c.ttsScript;
  });

  // Group by module for reporting
  const grouped: Record<string, number> = {};
  for (const i of toFix) {
    const mod = (i.content as any)?.moduleId || 'unknown';
    grouped[mod] = (grouped[mod] || 0) + 1;
  }

  console.log(`\nFound ${toFix.length} listening items to fix (passage → ttsScript)`);
  console.table(grouped);

  if (process.env.DRY_RUN === '1') {
    console.log('DRY_RUN: no changes made.');
    return;
  }

  let fixed = 0;
  for (const item of toFix) {
    const c = item.content as Record<string, any>;
    await p.item.update({
      where: { id: item.id },
      data: { content: { ...c, ttsScript: c.passage } }
    });
    fixed++;
  }

  console.log(`\n✅ Fixed ${fixed} listening items (passage → ttsScript)`);
  console.log('\nModules now ready for audio generation:');
  for (const mod of Object.keys(grouped)) console.log(' ', mod);

  await p.$disconnect();
}

main().catch(e => { console.error(e); p.$disconnect(); process.exit(1); });
