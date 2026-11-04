/** Run in the service environment; synthetic input only, no database access or secret output.
 * node --import tsx scripts/audits/openai-provider-smoke.mjs
 */
import 'dotenv/config';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
async function main() {
  assert(process.env.ALLOW_REAL_AI_SCORING_SMOKE === '1', 'Explicit smoke opt-in required');
  assert(process.env.B4SKILLS_AI_SMOKE_AUDIO_PATH, 'Synthetic WAV path required');
  const audio = readFileSync(process.env.B4SKILLS_AI_SMOKE_AUDIO_PATH);
  assert(audio.length < 10_000_000 && audio.subarray(0,4).toString() === 'RIFF' && audio.subarray(8,12).toString() === 'WAVE', 'Synthetic WAV required');
  const {OpenAIScoringService: service} = await import('../../src/lib/scoring/openai-scoring-service.ts');
  const text = 'Last summer I visited a small seaside town. Every morning I walked along the beach and bought bread at the market. The people were friendly and the weather was warm. I would like to go back next year because I enjoyed the quiet streets and the fresh food.';
  const task = 'Describe a holiday you enjoyed.';
  for (const [skill, call] of [
    ['WRITING', () => service.scoreWriting(text, task, 'B1')],
    ['SPEAKING', () => service.scoreSpeaking(audio.toString('base64'), 'audio/wav', task, 'B1')],
  ]) {
    const result = await call();
    assert(Number.isFinite(result.score) && result.score >= 0 && result.score <= 1 && result.providerModel, 'Invalid provider score');
    console.log(JSON.stringify({skill,passed:true,providerModel:result.providerModel,projectHeaderConfigured:!!process.env.OPENAI_PROJECT_ID}));
  }
  console.log(JSON.stringify({scope:'synthetic-provider-connectivity',zdrIndependentlyVerified:false,calibrationVerified:false,databaseAccessed:false}));
}
main().catch(error => {
  // Do not print provider bodies, headers, input recordings, API keys or database URLs.
  const status = Number.isInteger(error?.status) ? error.status : null;
  console.error(JSON.stringify({passed:false,status,errorClass:error?.name || 'Error'}));
  process.exitCode = 1;
});
