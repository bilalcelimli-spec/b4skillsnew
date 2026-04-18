import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from "@google/genai";
import gtts from 'gtts';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const audioDir = path.join(process.cwd(), 'public', 'audio');
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

async function fixSotaDB() {
  console.log("🚀 Starting SOTA Database Improvement Phase...");
  
  const items = await prisma.item.findMany();
  let deleted = 0;
  let fixedAnswers = 0;
  let generatedAudio = 0;
  let generatedImages = 0;

  for (const item of items) {
    let content: any = item.content || {};
    let needsUpdate = false;
    let shouldDelete = false;

    // 1. DELETE if completely missing prompt
    if (!content.prompt && !content.text) {
      shouldDelete = true;
    }

    // 2. FIX Missing Answers for objective tests
    if (!shouldDelete && (item.type === 'MULTIPLE_CHOICE' || item.type === 'FILL_IN_BLANKS')) {
      if (content.correctAnswer === undefined && content.correctOptionIndex === undefined) {
        if (content.options && content.options.length > 0) {
          try {
            console.log(`Fixing missing answer for item ${item.id}...`);
            const prompt = `Here is an English test question: "${content.prompt}". Options are: ${JSON.stringify(content.options)}. What is the correct answer's ID? Respond with ONLY the exact ID (e.g. "A" or "B").`;
            const resp = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
            const answerId = resp.text?.trim().replace(/['"]/g, '');
            if (answerId) {
              content.correctAnswer = answerId;
              needsUpdate = true;
              fixedAnswers++;
            } else {
              shouldDelete = true;
            }
          } catch (e) {
            shouldDelete = true;
          }
        } else {
          shouldDelete = true;
        }
      }
    }

    // 3. GENERATE Audio for LISTENING / DICTATION tests
    if (!shouldDelete && item.skill === 'LISTENING') {
      if (!content.audioUrl) {
        const textToSpeak = content.transcript || content.prompt;
        if (textToSpeak) {
          try {
            console.log(`Generating audio for LISTENING item ${item.id}...`);
            const filePath = path.join(audioDir, `${item.id}.mp3`);
            const tts = new gtts(textToSpeak, 'en'); // 'en' for English
            tts.save(filePath, (err: any) => {
              if (err) console.error("TTS Error:", err);
            });
            content.audioUrl = `/audio/${item.id}.mp3`;
            needsUpdate = true;
            generatedAudio++;
          } catch (e) {
            console.error("Audio generation failed", e);
          }
        } else {
          shouldDelete = true; // Listening item with no text to convert
        }
      }
    }

    // 4. Inject Images visually when they are completely missing but required conceptually (Primary)
    if (!shouldDelete && !content.imageUrl && (item.type === 'SPEAKING_PROMPT' || item.type === 'WRITING_PROMPT' || item.tags?.includes('Primary (7-10)'))) {
      if (item.skill === 'SPEAKING' || item.skill === 'WRITING' || Math.random() > 0.5) { // 50% chance for visual flair
        let visualPrompt = encodeURIComponent((content.prompt || "a scene").slice(0, 50));
        content.imageUrl = `https://image.pollinations.ai/prompt/${visualPrompt}?width=800&height=600&nologo=true`;
        needsUpdate = true;
        generatedImages++;
      }
    }

    // APPLY CHANGES
    if (shouldDelete) {
      await prisma.item.delete({ where: { id: item.id } });
      deleted++;
    } else if (needsUpdate) {
      await prisma.item.update({
        where: { id: item.id },
        data: { content: content }
      });
    }
  }

  console.log('✅ --- SOTA REFINEMENT COMPLETE ---');
  console.log(`Deleted Defective Items: ${deleted}`);
  console.log(`Fixed Missing Answers: ${fixedAnswers}`);
  console.log(`Generated Audio mp3s: ${generatedAudio}`);
  console.log(`Injected Visual Prompts: ${generatedImages}`);
}

fixSotaDB()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
