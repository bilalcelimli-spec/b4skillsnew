import { afterEach, expect, it, vi } from 'vitest';
const { generateContent } = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock('@google/genai', () => ({
  GoogleGenAI: class { models = { generateContent }; }, Modality: { AUDIO: 'AUDIO' },
}));
import { generateListeningAudio } from '../src/lib/audio/tts-generator';
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
it('routes bracket-labelled dialogue to distinct configured voices without writing audio', async () => {
  vi.stubEnv('GEMINI_API_KEY', 'test-only');
  generateContent.mockResolvedValue({ candidates: [] });
  await expect(generateListeningAudio({ moduleId: 'routing-test', cefrLevel: 'A2',
    ttsScript: '[Speaker A]: Hello.\n[Speaker B]: Hi.', outputDir: 'public/audio' })).rejects.toThrow('no audio data');
  const request = generateContent.mock.calls[0][0];
  expect(request.contents[0].parts[0].text).toBe('Speaker A: Hello.\nSpeaker B: Hi.');
  const configs = request.config.speechConfig.multiSpeakerVoiceConfig.speakerVoiceConfigs;
  expect(configs.map((c: any) => c.speaker)).toEqual(['Speaker A', 'Speaker B']);
  expect(new Set(configs.map((c: any) => c.voiceConfig.prebuiltVoiceConfig.voiceName)).size).toBe(2);
});
