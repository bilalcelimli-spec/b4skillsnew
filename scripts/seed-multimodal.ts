import { PrismaClient } from '@prisma/client';
// google-tts-api was removed (unmaintained, CVE-laden). Audio URLs are now
// generated via @google-cloud/text-to-speech in the main server pipeline.
// This seed script falls back to the Google Translate TTS URL pattern directly.
function getAudioUrl(text: string): string {
  const encoded = encodeURIComponent(text.slice(0, 200));
  return `https://translate.google.com/translate_tts?ie=UTF-8&tl=en-GB&q=${encoded}&client=tw-ob`;
}

const prisma = new PrismaClient();
import { installCreateGuard } from "./_validation-helper.js";
installCreateGuard(prisma, "seed-multimodal");

async function main() {
  console.log("Generating audio & injecting multimodal images...");

  // 1. Let's fix the mock items in DB first.
  const dbItems = await prisma.item.findMany();
  for (const item of dbItems) {
    const data = item.content as any;
    if (!data) continue;

    let updated = false;

    // Convert [Audio: ...] to real MP3
    if (data.passage && data.passage.startsWith('[Audio:') && data.passage.endsWith(']')) {
      const textToSpeak = data.passage.slice(7, -1).trim().replace(/['"]/g, '');
      const url = getAudioUrl(textToSpeak);
      data.audioUrl = url;
      data.passage = `Listen to the audio clip.`; // change the passage text to generic
      updated = true;
    }

    // Convert [Image of ...] to reliable Unsplash
    if (data.passage && data.passage.startsWith('[Image of') && data.passage.endsWith(']')) {
      data.imageUrl = "https://images.unsplash.com/photo-1560806887-1e4cd0b6caa6?auto=format&fit=crop&q=80&w=600"; 
      data.passage = "View the image carefully.";
      updated = true;
    }

    if (updated) {
      await prisma.item.update({
        where: { id: item.id },
        data: { content: data }
      });
      console.log(`Upgraded item to multimodal: ${item.id}`);
    }
  }

  // 2. Generate Brand New Gemini-level Multimodal Items
  console.log("\nGenerating Brand New Advanced Multimodal Items...");

  const newItems = [
    {
      skill: 'LISTENING',
      cefrLevel: 'C1',
      difficulty: 2.1,
      content: {
        audioUrl: getAudioUrl("Neural networks adapt their synaptic weights somewhat similar to biological brains."),
        prompt: "According to the audio, how do neural networks differ from traditional algorithms?",
        options: [
          { text: "They run faster on cloud servers.", isCorrect: false },
          { text: "They adapt their synaptic weights.", isCorrect: true },
          { text: "They were created by biologists.", isCorrect: false },
          { text: "They focus only on linguistic tasks.", isCorrect: false }
        ],
        passage: "Listen to the advanced academic excerpt."
      }
    },
    {
      skill: 'READING',
      cefrLevel: 'A2',
      difficulty: -1.0,
      content: {
        imageUrl: "https://images.unsplash.com/photo-1497935586351-b67a49e012bf?auto=format&fit=crop&q=80&w=800",
        passage: "Read the image context and answer.",
        prompt: "What beverage is the person drinking in the picture?",
        options: [
          { text: "A glass of cold water.", isCorrect: false },
          { text: "A cup of hot coffee.", isCorrect: true },
          { text: "Orange juice.", isCorrect: false }
        ]
      }
    },
    {
      skill: 'LISTENING',
      cefrLevel: 'B1',
      difficulty: 0.5,
      content: {
        audioUrl: getAudioUrl("Attention passengers. The 10:45 train to London Paddington is delayed by approximately 15 minutes due to signal failure."),
        prompt: "Why is the train delayed?",
        options: [
          { text: "Because of bad weather.", isCorrect: false },
          { text: "Because of signal failure.", isCorrect: true },
          { text: "Because the train driver is late.", isCorrect: false }
        ],
        passage: "Listen to the station announcement."
      }
    }
  ];

  for (let i = 0; i < newItems.length; i++) {
    const newItem = newItems[i];
    await prisma.item.create({
      data: {
        type: 'MULTIPLE_CHOICE',
        skill: newItem.skill as any,
        cefrLevel: newItem.cefrLevel as any,
        difficulty: newItem.difficulty,
        discrimination: 1.1,
        content: newItem.content,
        // Hack: Make sure new items get picked up globally
        organization: undefined
      }
    });
    console.log(`Created new multimodal item: ${newItem.skill} ${newItem.cefrLevel}`);
  }

  console.log("Done DB updates!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
