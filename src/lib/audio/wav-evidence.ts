/** Container evidence only: mono/stereo is not the number of speakers. */
export function inspectWav(bytes: Buffer): { valid: boolean; reason?: string; durationSeconds?: number; channels?: number } {
  if (bytes.length < 12 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE')
    return { valid: false, reason: 'Missing RIFF/WAVE signature' };
  const end = bytes.readUInt32LE(4) + 8;
  if (end > bytes.length) return { valid: false, reason: 'Declared RIFF size exceeds file size' };
  let rate = 0, channels = 0, dataSize = 0;
  for (let offset = 12; offset + 8 <= end;) {
    const name = bytes.toString('ascii', offset, offset + 4), size = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (start + size > end) return { valid: false, reason: 'Truncated WAV chunk' };
    if (name === 'fmt ' && size >= 16) {
      channels = bytes.readUInt16LE(start + 2); rate = bytes.readUInt32LE(start + 8);
    }
    if (name === 'data') dataSize += size;
    offset = start + size + (size % 2);
  }
  if (!channels || !rate || !dataSize) return { valid: false, reason: 'Missing format or non-empty data chunk' };
  return { valid: true, durationSeconds: dataSize / rate, channels };
}

/** Words that are actually spoken: speaker labels and bracketed production notes are not. */
export function spokenWordCount(script: string): number {
  return script.split(/\r?\n/)
    .map(line => line.replace(/\[[^\]\n]*\]/g, ' ').replace(/^\s*(?:Speaker\s+[A-Z]|[A-Z][A-Za-z.'-]*(?:\s+[A-Z][A-Za-z.'-]*){0,3}):\s+/, ''))
    .join(' ').split(/\s+/).filter(word => /[A-Za-z0-9]/.test(word)).length;
}

/** Fastest and slowest plausible delivery of a test recording, in words per minute. */
export const SPEECH_RATE_LIMITS = { max: 230, min: 60, minWords: 20 } as const;

/**
 * Whether a recording of this length can be a reading of this script.
 * A recording far too short for its script was cut off or made from other text;
 * scripts under 20 words are not judged (pauses dominate).
 */
export function speechRateCheck(durationSeconds: number, script: string): { words: number; wordsPerMinute: number | null; verdict: 'OK' | 'TOO_SHORT_FOR_SCRIPT' | 'TOO_LONG_FOR_SCRIPT' | 'NOT_JUDGED' } {
  const words = spokenWordCount(script);
  if (!(durationSeconds > 0)) return { words, wordsPerMinute: null, verdict: words ? 'TOO_SHORT_FOR_SCRIPT' : 'NOT_JUDGED' };
  const wordsPerMinute = Math.round(words / (durationSeconds / 60));
  if (words < SPEECH_RATE_LIMITS.minWords) return { words, wordsPerMinute, verdict: 'NOT_JUDGED' };
  return { words, wordsPerMinute, verdict: wordsPerMinute > SPEECH_RATE_LIMITS.max ? 'TOO_SHORT_FOR_SCRIPT'
    : wordsPerMinute < SPEECH_RATE_LIMITS.min ? 'TOO_LONG_FOR_SCRIPT' : 'OK' };
}
