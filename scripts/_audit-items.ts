import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const items = await p.item.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, skill: true, cefrLevel: true, type: true, tags: true, content: true }
  });

  // 1. Missing prompt
  const noPrompt = items.filter(i => {
    const c = i.content as any;
    return !c || !c.prompt || String(c.prompt).trim() === '';
  });

  // 2. Listening items missing passage/transcript
  const listeningNoPassage = items.filter(i => {
    if (i.skill !== 'LISTENING') return false;
    const c = i.content as any;
    return !c || !c.passage || String(c.passage).trim() === '';
  });

  // 3. Check for listening items where audioUrl or audioFile is referenced
  const listeningItems = items.filter(i => i.skill === 'LISTENING');
  const listeningNoAudio = listeningItems.filter(i => {
    const c = i.content as any;
    return !c || (!c.audioUrl && !c.audioFile && !c.audioKey);
  });

  console.log('\n=== AUDIT RESULTS ===');
  console.log('Total active items:', items.length);
  console.log('Items with missing prompt:', noPrompt.length);
  console.log('Listening items with missing passage:', listeningNoPassage.length);
  console.log('Listening items with no audio reference:', listeningNoAudio.length);
  console.log('Total listening items:', listeningItems.length);

  if (noPrompt.length > 0) {
    console.log('\n--- MISSING PROMPT (first 50) ---');
    for (const i of noPrompt.slice(0, 50)) {
      const c = i.content as any;
      console.log(`  [${i.skill}/${i.cefrLevel}/${i.type}] id=${i.id} tags=${JSON.stringify(i.tags)} prompt=${JSON.stringify(c?.prompt)}`);
    }
  }

  if (listeningNoPassage.length > 0) {
    console.log('\n--- LISTENING WITH NO PASSAGE (first 20) ---');
    for (const i of listeningNoPassage.slice(0, 20)) {
      const c = i.content as any;
      console.log(`  id=${i.id} moduleId=${c?.moduleId} tags=${JSON.stringify(i.tags)}`);
    }
  }

  if (listeningNoAudio.length > 0) {
    console.log('\n--- LISTENING WITH NO AUDIO REF (sample 10) ---');
    const grouped: Record<string, number> = {};
    for (const i of listeningNoAudio) {
      const c = i.content as any;
      const mod = c?.moduleId || 'unknown';
      grouped[mod] = (grouped[mod] || 0) + 1;
    }
    console.table(grouped);
  }

  // Show all distinct moduleIds in listening
  const moduleIds = new Set<string>();
  for (const i of listeningItems) {
    const c = i.content as any;
    if (c?.moduleId) moduleIds.add(c.moduleId);
  }
  console.log('\n--- ALL LISTENING MODULE IDs ---');
  for (const m of [...moduleIds].sort()) console.log(' ', m);

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
