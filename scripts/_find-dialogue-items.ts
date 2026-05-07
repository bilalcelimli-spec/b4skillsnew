import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Dialogue pattern: lines that start with "Name: ..."
const DIALOGUE_RE = /^[A-Z][a-zA-Z\s]+:\s+\S/m;

async function main() {
  const items = await prisma.item.findMany({
    where: { skill: 'LISTENING', status: 'ACTIVE' },
    select: { id: true, type: true, cefrLevel: true, content: true, tags: true },
  });

  const dialogueItems = items.filter((i) => {
    const t = (i.content as any).transcript || '';
    return DIALOGUE_RE.test(t);
  });

  console.log('Total LISTENING items:', items.length);
  console.log('Items with dialogue transcripts:', dialogueItems.length);
  
  for (const item of dialogueItems) {
    const c = item.content as any;
    const t = c.transcript || '';
    // Extract unique speaker names
    const speakers = [...new Set(t.match(/^([A-Z][a-zA-Z\s]+):/gm)?.map((m: string) => m.replace(':', '').trim()) || [])];
    console.log('\n  ID:', item.id, item.cefrLevel, item.tags.slice(0,2).join(','));
    console.log('  Speakers:', speakers.join(', '));
    console.log('  Snippet:', t.slice(0, 200));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
