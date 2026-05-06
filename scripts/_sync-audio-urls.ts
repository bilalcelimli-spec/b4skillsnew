/**
 * Sync audioUrl fields in the DB with actual files present in public/audio/.
 *
 * For every LISTENING item whose content.moduleId maps to a file that exists
 * in public/audio/, set content.audioUrl = /audio/<filename>.
 *
 * Skips items that already have the correct audioUrl.
 * Reports items whose moduleId has no matching audio file.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
const AUDIO_DIR = path.join(process.cwd(), 'public', 'audio');

async function main() {
  // Build a map: filename-stem → full filename (e.g. "primary-morning-school" → "primary-morning-school.wav")
  const files = fs.readdirSync(AUDIO_DIR);
  const stemToFile: Record<string, string> = {};
  for (const f of files) {
    const stem = path.basename(f, path.extname(f));
    stemToFile[stem] = f;
  }

  console.log(`Found ${files.length} audio files in public/audio/`);

  const items = await p.item.findMany({
    where: { skill: 'LISTENING' },
    select: { id: true, content: true },
  });

  console.log(`Found ${items.length} LISTENING items in DB\n`);

  let patched = 0;
  let alreadyOk = 0;
  const noFile: string[] = [];

  for (const item of items) {
    const c = item.content as any;
    const moduleId = c?.moduleId as string | undefined;

    if (!moduleId) continue;

    const filename = stemToFile[moduleId];
    if (!filename) {
      noFile.push(moduleId);
      continue;
    }

    const expectedUrl = `/audio/${filename}`;
    if (c.audioUrl === expectedUrl) {
      alreadyOk++;
      continue;
    }

    await p.item.update({
      where: { id: item.id },
      data: { content: { ...c, audioUrl: expectedUrl } },
    });
    console.log(`  Patched ${item.id}  ${moduleId}  ->  ${expectedUrl}`);
    patched++;
  }

  console.log(`\nSummary:`);
  console.log(`  Already correct : ${alreadyOk}`);
  console.log(`  Patched         : ${patched}`);

  if (noFile.length) {
    const unique = [...new Set(noFile)];
    console.log(`\n  Modules with NO matching audio file (${unique.length}):`);
    for (const m of unique) console.log(`    - ${m}`);
  }

  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
