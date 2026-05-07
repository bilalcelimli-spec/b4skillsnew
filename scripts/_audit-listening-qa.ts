import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.item.findMany({
    where: { skill: 'LISTENING', status: 'ACTIVE' },
    select: { id: true, type: true, cefrLevel: true, content: true, tags: true },
  });

  let noTranscript = 0, noAudio = 0, noCorrectAnswer = 0, isCorrectFormat = 0, idFormat = 0, dialogueCount = 0;
  const dialogueSamples: any[] = [];
  const noCorrectSamples: any[] = [];

  for (const item of items) {
    const c = item.content as any;
    if (!c.transcript) noTranscript++;
    if (!c.audioUrl) noAudio++;
    if (!c.correctAnswer) {
      noCorrectAnswer++;
      if (noCorrectSamples.length < 3) noCorrectSamples.push({ id: item.id, correctAnswer: c.correctAnswer, opts0: c.options?.[0] });
    }
    if (c.options && c.options[0] && c.options[0].isCorrect !== undefined) isCorrectFormat++;
    if (c.options && c.options[0] && c.options[0].id !== undefined) idFormat++;
    
    const t = c.transcript || '';
    const hasDialogue = t.includes('Speaker A:') || t.includes('Person 1:') || t.includes('A: ') || t.includes('B: ') || t.includes('Person A:');
    if (hasDialogue) {
      dialogueCount++;
      if (dialogueSamples.length < 2) dialogueSamples.push({ id: item.id, snippet: t.slice(0, 400) });
    }
  }

  console.log('Total LISTENING ACTIVE items:', items.length);
  console.log('No transcript:', noTranscript);
  console.log('No audioUrl:', noAudio);
  console.log('No correctAnswer:', noCorrectAnswer);
  console.log('Options format isCorrect-based:', isCorrectFormat);
  console.log('Options format id-based (A/B/C):', idFormat);
  console.log('Transcripts with dialogue markers:', dialogueCount);
  console.log('\nSample no-correctAnswer items:');
  noCorrectSamples.forEach(s => console.log(JSON.stringify(s, null, 2)));
  console.log('\nSample dialogue transcripts:');
  dialogueSamples.forEach(s => console.log(JSON.stringify(s, null, 2)));
}

main().catch(console.error).finally(() => prisma.$disconnect());
