import { describe, expect, it } from 'vitest';
import { buildWavHeader } from '../src/lib/audio/tts-generator';
import { inspectWav } from '../src/lib/audio/wav-evidence';
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
