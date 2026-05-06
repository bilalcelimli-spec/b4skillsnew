/**
 * Converts all raw PCM files in public/audio/ to proper WAV format by
 * prepending the correct RIFF/WAV header.
 *
 * Gemini 2.5 Flash TTS returns raw 16-bit signed PCM at 24 kHz, mono.
 * The generate script saved these bytes directly without a WAV header,
 * so browsers cannot decode them. This script adds the 44-byte WAV header
 * in-place to every file that doesn't already start with "RIFF".
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = path.join(__dirname, '../public/audio');

// Gemini 2.5 Flash TTS output parameters
const SAMPLE_RATE  = 24000;
const NUM_CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

function buildWavHeader(dataByteLength: number): Buffer {
  const byteRate   = SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
  const blockAlign = NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
  const header     = Buffer.alloc(44);

  // RIFF chunk
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + dataByteLength, 4);   // ChunkSize
  header.write('WAVE', 8, 'ascii');

  // fmt sub-chunk
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);                   // Subchunk1Size (PCM)
  header.writeUInt16LE(1, 20);                    // AudioFormat (1 = PCM)
  header.writeUInt16LE(NUM_CHANNELS, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(BITS_PER_SAMPLE, 34);

  // data sub-chunk
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(dataByteLength, 40);

  return header;
}

function main() {
  const files = fs.readdirSync(AUDIO_DIR).filter(f =>
    f.endsWith('.wav') || f.endsWith('.mp3')
  );

  let converted = 0;
  let skipped   = 0;
  let errors    = 0;

  for (const filename of files) {
    const filepath = path.join(AUDIO_DIR, filename);
    let data: Buffer;
    try {
      data = fs.readFileSync(filepath);
    } catch (e) {
      console.error(`  ERROR reading ${filename}:`, e);
      errors++;
      continue;
    }

    // Skip MP3 and already-valid WAV files
    if (filename.endsWith('.mp3')) { skipped++; continue; }
    if (data.slice(0, 4).toString('ascii') === 'RIFF') {
      console.log(`  SKIP  ${filename} — already has RIFF header`);
      skipped++;
      continue;
    }

    // Prepend WAV header
    const header = buildWavHeader(data.length);
    const wav    = Buffer.concat([header, data]);
    fs.writeFileSync(filepath, wav);
    const durationSec = (data.length / 2 / SAMPLE_RATE).toFixed(1);
    console.log(`  OK    ${filename}  ${(data.length / 1024).toFixed(0)} KB raw -> ${(wav.length / 1024).toFixed(0)} KB WAV  ~${durationSec}s`);
    converted++;
  }

  console.log(`\nDone.  Converted: ${converted}  Skipped: ${skipped}  Errors: ${errors}`);
}

main();
