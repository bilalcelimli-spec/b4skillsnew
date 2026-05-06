/**
 * One-off script: patch listening items that are missing `audioUrl` in their
 * content JSON by deriving the path from their `moduleId`.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  const items = await p.item.findMany({
    where: { skill: 'LISTENING' },
    select: { id: true, content: true },
  });

  const noAudio = items.filter((i) => !(i.content as any)?.audioUrl);
  console.log(`Items missing audioUrl: ${noAudio.length}`);

  let patched = 0;
  for (const i of noAudio) {
    const c = i.content as any;
    const moduleId = c?.moduleId as string | undefined;
    if (!moduleId) {
      console.log(`  SKIP ${i.id} — no moduleId`);
      continue;
    }
    const audioUrl = `/audio/${moduleId}.wav`;
    const updated = { ...c, audioUrl };
    await p.item.update({ where: { id: i.id }, data: { content: updated } });
    console.log(`  Patched ${i.id} -> ${audioUrl}`);
    patched++;
  }

  console.log(`\nDone. Total patched: ${patched}`);
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
