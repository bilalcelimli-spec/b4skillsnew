import { beforeEach, describe, expect, it, vi } from 'vitest';
import { spawnSync } from 'node:child_process';
const mocks = vi.hoisted(() => ({ create: vi.fn(), key: vi.fn() }));
vi.mock('openai', () => ({ default: class { chat = { completions: { create: mocks.create } }; } }));
vi.mock('../../secrets/secrets-manager', () => ({ SecretsManager: { get: mocks.key } }));
import { normalizeScoringAudio, scoreSpeakingWithOpenAI } from '../openai-speaking-service';
const score = {score:.46,confidence:.8,cefrLevel:'B1',feedback:'Clear.',transcript:'This is a recording.',rubricScores:{grammar:5,vocabulary:5,coherence:5,taskRelevance:5,fluency:5},speakingFeatures:{speechRate:90,pauseDuration:1,pronunciationClarity:5,lexicalDiversity:5,grammaticalAccuracy:5,discourseStructure:5},corrections:[]};
const available=spawnSync(process.env.FFMPEG_PATH || 'ffmpeg',['-version']).status===0;
const wav=()=>{
 const b=Buffer.alloc(32044);b.write('RIFF',0);b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(32000,40);return b.toString('base64');
};
beforeEach(()=>{vi.clearAllMocks();mocks.key.mockReturnValue('test-key');mocks.create.mockResolvedValue({model:'audio-snapshot',choices:[{finish_reason:'stop',message:{content:JSON.stringify(score)}}]});});
it('rejects non-audio and malformed base64 before conversion',async()=>{
 await expect(normalizeScoringAudio('invalid url','audio/mp4')).rejects.toThrow('Invalid');
 await expect(normalizeScoringAudio('AAAA','text/plain')).rejects.toThrow('Invalid');
});
describe.skipIf(!available)('local pipe conversion and audio scoring',()=>{
 it('sends the real normalized recording with storage disabled and retains model provenance',async()=>{
  const result=await scoreSpeakingWithOpenAI(wav(),'audio/wav','Describe a place.','B1');
  expect(result.providerModel).toBe('audio-snapshot');
  const request=mocks.create.mock.calls[0][0];expect(request.store).toBe(false);
  const input=request.messages[1].content[1].input_audio;
  expect(input.format).toBe('wav');expect(Buffer.from(input.data,'base64').toString('ascii',0,4)).toBe('RIFF');
 });
 it('does not accept truncated or refused provider output',async()=>{
  mocks.create.mockResolvedValue({choices:[{finish_reason:'length',message:{content:JSON.stringify(score)}}]});
  await expect(scoreSpeakingWithOpenAI(wav(),'audio/wav','task')).rejects.toThrow('Incomplete');
 });
 it('validates fenced audio-model JSON without discarding evidence checks',async()=>{
  mocks.create.mockResolvedValue({model:'audio-snapshot',choices:[{finish_reason:'stop',message:{content:'```json\n'+JSON.stringify(score)+'\n```'}}]});
  expect((await scoreSpeakingWithOpenAI(wav(),'audio/wav','task')).providerModel).toBe('audio-snapshot');
  mocks.create.mockResolvedValue({choices:[{finish_reason:'stop',message:{content:'```json\n'+JSON.stringify({...score,score:2})+'\n```'}}]});
  await expect(scoreSpeakingWithOpenAI(wav(),'audio/wav','task')).rejects.toThrow('Invalid AI score');
 });
 it('rejects an acoustic score without supporting audio features',async()=>{
  mocks.create.mockResolvedValue({choices:[{finish_reason:'stop',message:{content:JSON.stringify({...score,speakingFeatures:{speechRate:90}})}}]});
  await expect(scoreSpeakingWithOpenAI(wav(),'audio/wav','task')).rejects.toThrow('Missing AI speaking feature');
 });
 it('fails closed on undecodable recordings without calling the API',async()=>{
  await expect(scoreSpeakingWithOpenAI(Buffer.from('not audio').toString('base64'),'audio/mp4','task')).rejects.toThrow();
  expect(mocks.create).not.toHaveBeenCalled();
 });
});
