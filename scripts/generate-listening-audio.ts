import { PrismaClient } from '@prisma/client';
import textToSpeech from '@google-cloud/text-to-speech';
import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const client = new textToSpeech.TextToSpeechClient();

async function main() {
  console.log('Generating audio files from database content using Google Cloud TTS...');

  // Ensure output directory exists
  const publicAudioDir = path.join(__dirname, '../public/audio');
  if (!fs.existsSync(publicAudioDir)) {
    fs.mkdirSync(publicAudioDir, { recursive: true });
    console.log(`Created directory: ${publicAudioDir}`);
  }

  // Fetch all active listening items
  const items = await prisma.item.findMany({
    where: {
      skill: 'LISTENING',
      status: 'ACTIVE',
    },
  });

  // Group by moduleId to avoid duplicate generations
  const uniqueModules = new Map<string, any>();
  for (const item of items) {
    const content = item.content as any;
    if (content && content.moduleId && content.ttsScript && content.ttsSettings) {
      if (!uniqueModules.has(content.moduleId)) {
        uniqueModules.set(content.moduleId, content);
      }
    }
  }

  console.log(`Found ${uniqueModules.size} unique listening modules to synthesize.`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const [moduleId, content] of uniqueModules.entries()) {
    const outputPath = path.join(publicAudioDir, `${moduleId}.mp3`);
    
    // Skip if file already exists (optional, remove this block if you want to overwrite)
    if (fs.existsSync(outputPath)) {
      console.log(`[SKIP] Audio for module '${moduleId}' already exists.`);
      skipCount++;
      continue;
    }

    try {
      console.log(`[SYNTHESIZING] Module: '${moduleId}'...`);
      
      const request = {
        input: { text: content.ttsScript },
        voice: {
          languageCode: content.ttsSettings.languageCode,
          name: content.ttsSettings.voiceName,
        },
        audioConfig: {
          audioEncoding: 'MP3' as const,
          speakingRate: content.ttsSettings.speakingRate || 1.0,
          pitch: content.ttsSettings.pitch || 0.0,
        },
      };

      // Perform the text-to-speech request
      const [response] = await client.synthesizeSpeech(request);
      
      if (response.audioContent) {
        fs.writeFileSync(outputPath, response.audioContent as Uint8Array);
        console.log(`[SUCCESS] Saved audio to ${outputPath}`);
        successCount++;
      } else {
        console.error(`[ERROR] No audio content returned for module '${moduleId}'.`);
        errorCount++;
      }
      
      // Wait a moment to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error: any) {
      console.error(`[ERROR] Failed to synthesize module '${moduleId}':`, error.message);
      errorCount++;
    }
  }

  console.log('\n--- Audio Generation Summary ---');
  console.log(`Total unique modules: ${uniqueModules.size}`);
  console.log(`Successfully generated: ${successCount}`);
  console.log(`Skipped (already exist): ${skipCount}`);
  console.log(`Failed: ${errorCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
