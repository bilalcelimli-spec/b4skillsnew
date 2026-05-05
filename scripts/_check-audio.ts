import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const items = await p.item.findMany({
    where: { status: 'ACTIVE', skill: 'LISTENING' },
    select: { id: true, content: true }
  });
  const noAudio = items.filter(i => {
    const c = i.content as any;
    return !c || !c.audioUrl;
  });
  const grouped: Record<string, { hasTts: boolean; count: number }> = {};
  for (const i of noAudio) {
    const c = i.content as any;
    const mod = (c && c.moduleId) ? c.moduleId : 'unknown';
    if (!grouped[mod]) grouped[mod] = { hasTts: !!(c && c.ttsScript), count: 0 };
    grouped[mod].count++;
  }
  console.log('\nModules with no audioUrl:');
  for (const [k, v] of Object.entries(grouped)) {
    console.log(`  ${k}  hasTts=${v.hasTts}  count=${v.count}`);
  }
  // print sample of a no-tts module
  const noTtsMod = Object.entries(grouped).find(([_, v]) => !v.hasTts);
  if (noTtsMod) {
    const sample = noAudio.find(i => {
      const c = i.content as any;
      return (c && c.moduleId) === noTtsMod[0];
    });
    if (sample) {
      console.log('\nSample content keys for', noTtsMod[0], ':', Object.keys((sample.content as any) || {}));
    }
  }
  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
