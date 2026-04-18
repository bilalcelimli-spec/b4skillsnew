import { PrismaClient } from '@prisma/client';
import * as googleTTS from 'google-tts-api';

const prisma = new PrismaClient();

async function main() {
  const items = await prisma.item.findMany();
  for (const item of items) {
    const data = item.content as any;
    let updated = false;

    // Fix the "Apple" question
    if (data.prompt === 'What is this?' && data.options && data.options.some((o: any) => o.text.includes('apple'))) {
      data.imageUrl = "https://images.unsplash.com/photo-1560806887-1e4cd0b6caa6?auto=format&fit=crop&q=80&w=600"; // red apple
      updated = true;
    }

    // Fix listening: regenerate audio for the actual passage context
    // In our mock items, what was the passage for listening?
    // Let's check if there is a 'passage' field that holds the real text.
    // Wait, earlier I replaced it with "Listen to the audio clip."
    updated = true;
    
  }
}
