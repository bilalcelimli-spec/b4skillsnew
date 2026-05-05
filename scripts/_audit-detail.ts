/**
 * Detailed audit for:
 * 1. Reading phase4 items with 'question' instead of 'prompt'
 * 2. Listening items missing ttsScript or audioUrl
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const items = await p.item.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, skill: true, cefrLevel: true, tags: true, content: true }
  });

  // --- Reading: question vs prompt ---
  const withQuestion = items.filter(i => {
    const c = i.content as any;
    return i.skill === 'READING' && c && c.question && !c.prompt;
  });
  console.log(`\nReading items with 'question' field (no 'prompt'): ${withQuestion.length}`);

  // --- Listening: missing ttsScript ---
  const listening = items.filter(i => i.skill === 'LISTENING');
  const noTts = listening.filter(i => {
    const c = i.content as any;
    return !c?.ttsScript || String(c.ttsScript).trim() === '';
  });
  const hasTtsNoAudio = listening.filter(i => {
    const c = i.content as any;
    return c?.ttsScript && !c?.audioUrl;
  });

  // Group noTts by moduleId
  const noTtsModules: Record<string, number> = {};
  for (const i of noTts) {
    const mod = (i.content as any)?.moduleId || 'no-moduleId';
    noTtsModules[mod] = (noTtsModules[mod] || 0) + 1;
  }

  const hasTtsNoAudioModules: Record<string, number> = {};
  for (const i of hasTtsNoAudio) {
    const mod = (i.content as any)?.moduleId || 'no-moduleId';
    hasTtsNoAudioModules[mod] = (hasTtsNoAudioModules[mod] || 0) + 1;
  }

  console.log(`\nListening items missing ttsScript: ${noTts.length}`);
  if (noTts.length > 0) {
    console.log('Modules missing ttsScript:');
    console.table(noTtsModules);
  }

  console.log(`\nListening items with ttsScript but no audioUrl: ${hasTtsNoAudio.length}`);
  if (hasTtsNoAudio.length > 0) {
    console.log('Modules with ttsScript but no audioUrl:');
    console.table(hasTtsNoAudioModules);
  }

  // Check 1 sample item content from each no-audio module
  const noAudioSampled = new Set<string>();
  for (const i of listening) {
    const c = i.content as any;
    const mod = c?.moduleId;
    if (!c?.audioUrl && mod && !noAudioSampled.has(mod)) {
      noAudioSampled.add(mod);
      console.log(`\n[${mod}] sample content keys:`, Object.keys(c || {}));
      console.log(`  ttsScript (first 100): ${String(c?.ttsScript || '').slice(0, 100)}`);
    }
  }

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
