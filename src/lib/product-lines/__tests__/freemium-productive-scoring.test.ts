import { beforeEach, describe, expect, it, vi } from 'vitest';
const scorer = vi.hoisted(() => ({writing:vi.fn(),speaking:vi.fn()}));
vi.mock('../../scoring/scoring-orchestrator', () => ({ScoringOrchestrator:{scoreWriting:scorer.writing,scoreSpeaking:scorer.speaking}}));
import { evaluateFreemiumResponse } from '../freemium-productive-scoring';
import { recordFreemiumScore, type FreemiumSkillBreakdown } from '../freemium-response-scoring';
const writing = {skill:'WRITING',type:'WRITING_PROMPT',content:{prompt:'Write about your family.'}};
const speaking = {...writing,skill:'SPEAKING',type:'SPEAKING_PROMPT'};
const decision = {score:.7,scoreSource:'ai_auto',requiresHumanReview:false,aiResult:{feedback:'Relevant response'}};
beforeEach(() => {vi.clearAllMocks();scorer.writing.mockResolvedValue(decision);scorer.speaking.mockResolvedValue(decision);});
describe('six-skill response pipeline', () => {
  it.each(['GRAMMAR','VOCABULARY','READING','LISTENING'])('scores %s objectively without invoking a productive grader',async skill => {
    const item = {skill,type:'MULTIPLE_CHOICE',content:{options:['wrong','right'],correctAnswer:'B'}};
    expect((await evaluateFreemiumResponse(item,1)).score).toBe(1);
    expect((await evaluateFreemiumResponse(item,0)).score).toBe(0);
    expect(scorer.writing).not.toHaveBeenCalled();
  });
  it('uses the actual essay and returns fractional rubric credit',async () => {
    const evaluation = await evaluateFreemiumResponse(writing,'My family lives in London.');
    expect(scorer.writing).toHaveBeenCalledWith('My family lives in London.',writing.content.prompt);
    expect(evaluation).toMatchObject({score:.7,kind:'rubric',status:'scored',aiScore:.7,scoreSource:'ai_auto',scoringMode:'WRITING'});
    const breakdown: Record<string, FreemiumSkillBreakdown> = {};
    recordFreemiumScore(breakdown,'WRITING',evaluation.score,evaluation.kind);
    expect(breakdown.WRITING).toMatchObject({scoreSum:.7,correct:0,scored:1});
  });
  it('sends the actual recording and MIME type to the speaking grader',async () => {
    const audio = {audio:'UklGRmAAAAAAAAAAZm10IAAAAA==',mimeType:'audio/wav'};
    await evaluateFreemiumResponse(speaking,audio);
    expect(scorer.speaking).toHaveBeenCalledWith(audio.audio,audio.mimeType,speaking.content.prompt);
    await expect(evaluateFreemiumResponse(speaking,'speaking_recorded')).rejects.toThrow('audio recording');
  });
  it('gives zero credit to an integrity-rejected one-word response',async () => {
    scorer.writing.mockResolvedValue({...decision,score:0,scoreSource:'rejected_integrity',requiresHumanReview:true});
    expect(await evaluateFreemiumResponse(writing,'hello')).toMatchObject({score:0,aiScore:null,scoreSource:'rejected_integrity'});
  });
  it.each(['ai_unavailable','ai_flagged'])('does not let %s influence ability',async scoreSource => {
    scorer.writing.mockResolvedValue({...decision,score:.9,scoreSource,requiresHumanReview:true});
    expect(await evaluateFreemiumResponse(writing,'An essay')).toMatchObject({score:null,aiScore:scoreSource==='ai_unavailable'?null:.9,scoreSource});
  });
  it('rejects missing or malformed audio before calling the provider',async () => {
    for(const audio of [{audio:'not audio',mimeType:'audio/wav'},{audio:'UklGRmAAAAAAAAAAZm10IAAAAA==',mimeType:'image/png'}]) {
      await expect(evaluateFreemiumResponse(speaking,audio)).rejects.toThrow();
    }
    expect(scorer.speaking).not.toHaveBeenCalled();
  });
});
