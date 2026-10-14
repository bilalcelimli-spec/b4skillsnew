import { beforeEach, describe, expect, it, vi } from 'vitest';
const scorer = vi.hoisted(() => ({writing:vi.fn(),speaking:vi.fn()}));
vi.mock('../../scoring/scoring-orchestrator', () => ({ScoringOrchestrator:{scoreWriting:scorer.writing,scoreSpeaking:scorer.speaking}}));
import { evaluateFreemiumResponse } from '../freemium-productive-scoring';
import { recordFreemiumScore, type FreemiumSkillBreakdown } from '../freemium-response-scoring';
const writing = {skill:'WRITING',type:'WRITING_PROMPT',content:{prompt:'Write about your family.',rubric:'Task achievement and language control'}};
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
  it('scores legacy gap formats consistently without shuffling the public or diagnostic form',async () => {
    const dropdown = {skill:'GRAMMAR',type:'FILL_IN_BLANKS',content:{prompt:'The Earth ____ around the Sun.',
      options:['go','going','goes','went'],correctIndex:2,correctAnswer:'C'}};
    expect((await evaluateFreemiumResponse(dropdown,'C')).score).toBe(1);
    expect((await evaluateFreemiumResponse(dropdown,'goes')).score).toBe(1);
    expect((await evaluateFreemiumResponse(dropdown,'go')).score).toBe(0);
    const listening = {skill:'LISTENING',type:'FILL_IN_BLANKS',content:{prompt:'Hair: ______; Colour: ______',correctAnswer:'short|brown'}};
    expect((await evaluateFreemiumResponse(listening,'short|brown')).score).toBe(1);
    expect((await evaluateFreemiumResponse(listening,'brown|short')).score).toBe(0);
  });
  it('uses the actual essay and returns fractional rubric credit',async () => {
    const evaluation = await evaluateFreemiumResponse(writing,'My family lives in London.');
    expect(scorer.writing).toHaveBeenCalledWith('My family lives in London.',expect.stringContaining(writing.content.prompt),undefined);
    expect(evaluation).toMatchObject({score:.7,kind:'rubric',status:'scored',aiScore:.7,scoreSource:'ai_auto',scoringMode:'WRITING'});
    const breakdown: Record<string, FreemiumSkillBreakdown> = {};
    recordFreemiumScore(breakdown,'WRITING',evaluation.score,evaluation.kind);
    expect(breakdown.WRITING).toMatchObject({scoreSum:.7,correct:0,scored:1});
  });
  it('sends the actual recording and MIME type to the speaking grader',async () => {
    const audio = {audio:'UklGRmAAAAAAAAAAZm10IAAAAA==',mimeType:'audio/wav'};
    await evaluateFreemiumResponse(speaking,audio);
    expect(scorer.speaking).toHaveBeenCalledWith(audio.audio,audio.mimeType,expect.stringContaining(speaking.content.prompt),undefined,undefined);
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
it('uses authored target CEFR and task rubric for synchronous productive grading', async () => {
 await evaluateFreemiumResponse({...writing,cefrLevel:'A1',content:{...writing.content,rubric:{task:'Mention two family members.'}}},'My family lives in London.');
 expect(scorer.writing).toHaveBeenCalledWith('My family lives in London.',expect.stringContaining('Mention two family members.'),'A1');
});
it('withholds synchronous grades for missing rubrics without calling a model', async () => {
 const result=await evaluateFreemiumResponse({...writing,content:{prompt:'Describe your family.'}},'My family lives in London.');
 expect(result).toMatchObject({score:null,aiScore:null,status:'review_required',reviewReasons:['RUBRIC_MISSING']});
 expect(scorer.writing).not.toHaveBeenCalled();
});
it('accepts legacy detailed scoringRubric criteria when rubric is absent', async () => {
 const result=await evaluateFreemiumResponse({...writing,content:{prompt:'Describe your family.',
  scoringRubric:[{name:'Task',maxScore:2,descriptor:'Mention two family members.'}]}},'My family lives in London.');
 expect(result.status).toBe('scored');expect(scorer.writing).toHaveBeenCalledWith(expect.any(String),expect.stringContaining('Mention two family members.'),undefined);
});
