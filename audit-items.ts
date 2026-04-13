import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function audit() {
  const items = await prisma.item.findMany();
  console.log(`Total Database Items: ${items.length}`);
  
  let missingPrompt = 0;
  let missingAnswer = 0;
  let listeningWithoutAudio = 0;
  let missingVisuals = 0; // if it's meant to have visual
  
  const defects: string[] = [];

  for (const item of items) {
    const content: any = item.content || {};
    let isDefective = false;

    if (!content.prompt && !content.text) {
      missingPrompt++;
      isDefective = true;
      defects.push(`Item ${item.id} (${item.skill}): Missing prompt/text`);
    }

    if (item.type === 'MULTIPLE_CHOICE' || item.type === 'FILL_IN_BLANKS') {
      if (content.correctAnswer === undefined && content.correctOptionIndex === undefined) {
        missingAnswer++;
        isDefective = true;
        defects.push(`Item ${item.id} (${item.skill}): Missing answer for objective task`);
      }
    }

    if (item.skill === 'LISTENING') {
      if (!content.audioUrl && !content.audio) {
        listeningWithoutAudio++;
        isDefective = true;
        defects.push(`Item ${item.id} (LISTENING): Missing audioUrl`);
      }
    }
  }

  console.log('--- AUDIT RESULTS ---');
  console.log(`Missing Prompts: ${missingPrompt}`);
  console.log(`Missing Answers: ${missingAnswer}`);
  console.log(`Listening without Audio: ${listeningWithoutAudio}`);
  
  console.log('Sample Defects:');
  console.log(defects.slice(0, 15).join('\n'));
}

audit().finally(() => prisma.$disconnect());
