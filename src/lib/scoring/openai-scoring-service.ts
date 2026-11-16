import { scoreWritingWithOpenAI } from './openai-writing-service.js';
import { scoreSpeakingWithOpenAI } from './openai-speaking-service.js';
import type { CefrLevel } from '../cefr/cefr-framework.js';
export const OpenAIScoringService = {
  async scoreWriting(text: string, task: string, level?: CefrLevel) { const r = await scoreWritingWithOpenAI(text, task, level); return { ...r.result, providerModel: r.model }; },
  async verifyWriting(text: string, task: string, level?: CefrLevel) { const r = await scoreWritingWithOpenAI(text, task, level, 'verifier'); return { ...r.result, providerModel: r.model }; },
  scoreSpeaking: (audio: string, mime: string, task: string, level?: CefrLevel) => scoreSpeakingWithOpenAI(audio, mime, task, level),
  verifySpeaking: (audio: string, mime: string, task: string, level?: CefrLevel) => scoreSpeakingWithOpenAI(audio, mime, task, level, 'verifier'),
};
