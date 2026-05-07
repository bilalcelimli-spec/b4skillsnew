import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.item.findMany({
    where: { skill: 'LISTENING', status: 'ACTIVE' },
    select: { id: true, type: true, cefrLevel: true, content: true, tags: true },
  });

  const withTranscript = items.filter((i) => (i.content as any).transcript);
  console.log('Items with transcript:', withTranscript.length);
  
  for (const item of withTranscript.slice(0, 5)) {
    const c = item.content as any;
    console.log('\n--- ID:', item.id, item.cefrLevel, item.tags.slice(0,3).join(','));
    console.log('  transcript:\n', (c.transcript || '').slice(0, 500));
    console.log('  correctAnswer:', c.correctAnswer);
    console.log('  options[0]:', JSON.stringify(c.options?.[0]));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
