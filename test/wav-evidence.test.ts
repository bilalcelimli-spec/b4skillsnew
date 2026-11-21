import { describe, expect, it } from 'vitest';
import { buildWavHeader } from '../src/lib/audio/tts-generator';
import { inspectWav, speechRateCheck, spokenWordCount } from '../src/lib/audio/wav-evidence';
describe('WAV container evidence', () => {
  it('measures duration without claiming speaker count', () => {
    expect(inspectWav(buildWavHeader(Buffer.alloc(48000)))).toEqual({ valid: true, durationSeconds: 1, channels: 1 });
  });
  it('rejects truncated audio', () => {
    expect(inspectWav(buildWavHeader(Buffer.alloc(48000)).subarray(0, 100)).valid).toBe(false);
  });
  it('rejects HTML delivered as a WAV', () => {
    expect(inspectWav(Buffer.from('<html>This is not audio</html>')).valid).toBe(false);
  });
  it('rejects empty audio data', () => {
    expect(inspectWav(buildWavHeader(Buffer.alloc(0))).valid).toBe(false);
  });
});

describe('recording length against its script', () => {
  const script = Array.from({ length: 240 }, () => 'word').join(' ');
  it('does not count speaker labels or production notes as spoken words', () => {
    expect(spokenWordCount('[Maya — child, female, age 7]\nMaya: My name is Maya.\nSpeaker B: Hello, Maya. [pause]')).toBe(6);
  });
  it('accepts a normal reading pace', () => {
    expect(speechRateCheck(96, script)).toEqual({ words: 240, wordsPerMinute: 150, verdict: 'OK' });
  });
  it('flags a recording that is far too short to contain its script', () => {
    expect(speechRateCheck(6.2, script).verdict).toBe('TOO_SHORT_FOR_SCRIPT');
    expect(speechRateCheck(0, script).verdict).toBe('TOO_SHORT_FOR_SCRIPT');
  });
  it('flags a recording far longer than its script and leaves very short scripts alone', () => {
    expect(speechRateCheck(600, script).verdict).toBe('TOO_LONG_FOR_SCRIPT');
    expect(speechRateCheck(30, 'Hello. How are you today?').verdict).toBe('NOT_JUDGED');
  });
});
