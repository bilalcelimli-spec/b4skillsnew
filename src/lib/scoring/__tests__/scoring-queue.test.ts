import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  writing: vi.fn(), speaking: vi.fn(), speakingText: vi.fn(), update: vi.fn(), find: vi.fn(), many: vi.fn(), enqueue: vi.fn(), refresh: vi.fn(),
}));
vi.mock('../../prisma', () => ({prisma:{response:{updateMany:mocks.update,findUnique:mocks.find,findMany:mocks.many}}}));
vi.mock('../scoring-orchestrator', () => ({ScoringOrchestrator:{scoreWriting:mocks.writing,scoreSpeaking:mocks.speaking,scoreSpeakingFromText:mocks.speakingText}}));
vi.mock('../rating-queue', () => ({RatingQueueService:{enqueue:mocks.enqueue}}));
vi.mock('../score-report-refresh', () => ({refreshScoredSession:mocks.refresh}));
vi.mock('../../observability/index', () => ({logger:{debug:vi.fn(),warn:vi.fn(),error:vi.fn()}}));
import { enqueueScoringJob, getScoringQueueStats, isScoringJobPending, recoverPendingScoringJobs, drainScoringQueue } from '../scoring-queue';
const decision = {score:.8,requiresHumanReview:false,scoreSource:'ai_auto',aiResult:{score:.8,feedback:'Good'},reviewReasons:[],scoringPasses:[]};
const job = {sessionId:'session',responseId:'response',itemId:'item',skill:'WRITING' as const,value:'essay',prompt:'Write an essay',rubric:'Task achievement and language control'};
const tick = () => new Promise(resolve => setImmediate(resolve));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.update.mockResolvedValue({count:1}); mocks.find.mockResolvedValue({metadata:{originalEvidence:true},humanScore:null}); mocks.enqueue.mockResolvedValue('task'); mocks.refresh.mockResolvedValue(undefined);
  mocks.writing.mockResolvedValue(decision); mocks.speaking.mockResolvedValue(decision);
});
describe('background scoring persistence', () => {
  it('persists real scores and refreshes the session and completed report', async () => {
    await enqueueScoringJob(job);
    expect(mocks.update.mock.calls[0][0].data).toMatchObject({score:.8,adjustedScore:null,isCorrect:true,metadata:{asyncScored:true,pendingAsyncScore:false,requiresHumanReview:false}});
    expect(mocks.refresh).toHaveBeenCalledWith('session');
    expect(getScoringQueueStats().activeCount).toBe(0);
  });
  it('persists distinct report retry versions with each committed grade', async () => {
    await enqueueScoringJob(job);
    await enqueueScoringJob(job);
    const first=mocks.update.mock.calls[0][0].data.metadata;
    const second=mocks.update.mock.calls[1][0].data.metadata;
    expect(first.reportRefreshPending).toBe(true);
    expect(first.scoringPolicyVersion).toBe('2026-10-14.5');
    expect(first.reportRefreshVersion).toEqual(expect.any(String));
    expect(second.reportRefreshVersion).not.toBe(first.reportRefreshVersion);
  });
  it('withholds the AI outage placeholder instead of recording it as a grade', async () => {
    mocks.writing.mockResolvedValue({...decision,score:.5,scoreSource:'ai_unavailable',requiresHumanReview:true});
    await enqueueScoringJob(job);
    expect(mocks.update.mock.calls[0][0].data).toMatchObject({score:null,isCorrect:null,aiScore:null,metadata:{scoreFailed:true,aiUnavailable:true,requiresHumanReview:true}});
    expect(mocks.enqueue).toHaveBeenCalledOnce();
  });
  it('routes disputed grades to human review with no proficiency credit', async () => {
    mocks.writing.mockResolvedValue({...decision,scoreSource:'ai_flagged',requiresHumanReview:true});
    await enqueueScoringJob(job);
    expect(mocks.update.mock.calls[0][0].data.score).toBeNull();
  });
  it('persists a failed job without stale numeric scores', async () => {
    mocks.writing.mockRejectedValue(new Error('Provider failure'));
    await expect(enqueueScoringJob(job)).rejects.toThrow('Provider failure');
    expect(mocks.update.mock.calls[0][0].data).toMatchObject({score:null,adjustedScore:null,isCorrect:null,metadata:{scoreFailed:true}});
    expect(mocks.refresh).toHaveBeenCalledWith('session');
    expect(mocks.enqueue).toHaveBeenCalledOnce();
  });
  it('still routes a provider failure to review if refreshing its report also fails', async () => {
    mocks.writing.mockRejectedValue(new Error('Provider failure'));
    mocks.refresh.mockRejectedValue(new Error('Report temporarily unavailable'));
    await expect(enqueueScoringJob(job)).rejects.toThrow('Provider failure');
    expect(mocks.enqueue).toHaveBeenCalledOnce();
    expect(getScoringQueueStats()).toMatchObject({activeCount:0,queueDepth:0});
  });
  it('preserves original task metadata after AI scoring', async () => {
    await enqueueScoringJob(job);
    expect(mocks.update.mock.calls[0][0].data.metadata.originalEvidence).toBe(true);
  });
  it('does not overwrite a finalized human grade when an old AI job completes', async () => {
    mocks.find.mockResolvedValue({metadata:{scoreSource:'human'},humanScore:.9});
    const result=await enqueueScoringJob(job);
    expect(result).toMatchObject({score:.9,scoreSource:'human'});
    expect(mocks.update).not.toHaveBeenCalled();expect(mocks.enqueue).not.toHaveBeenCalled();
  });
  it('atomically protects a human grade finalized between read and AI write', async () => {
    mocks.update.mockResolvedValue({count:0});
    mocks.find.mockResolvedValueOnce({metadata:{},humanScore:null}).mockResolvedValueOnce({humanScore:.95});
    expect(await enqueueScoringJob(job)).toMatchObject({score:.95,scoreSource:'human'});
    expect(mocks.update.mock.calls[0][0].where).toEqual({id:'response',humanScore:null});
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });
  it('does not clear human evidence when the AI provider fails', async () => {
    mocks.writing.mockRejectedValue(new Error('Provider failure'));
    mocks.find.mockResolvedValue({metadata:{},humanScore:.75});
    expect(await enqueueScoringJob(job)).toMatchObject({score:.75,scoreSource:'human'});
    expect(mocks.update).not.toHaveBeenCalled();expect(mocks.enqueue).not.toHaveBeenCalled();
  });
  it('rejects a duplicate scoring job instead of grading the same response twice', async () => {
    let resolve!: (value:unknown)=>void;
    mocks.writing.mockImplementation(() => new Promise(done=>{resolve=done}));
    const pending=enqueueScoringJob(job);
    expect(isScoringJobPending(job.responseId)).toBe(true);
    await expect(enqueueScoringJob(job)).rejects.toThrow('already being scored');
    await tick();resolve(decision);await pending;
    expect(isScoringJobPending(job.responseId)).toBe(false);
  });
  it('actually enforces concurrency when many submissions arrive in one event-loop tick', async () => {
    const resolvers: (() => void)[] = [];
    mocks.writing.mockImplementation(() => new Promise(resolve => resolvers.push(() => resolve(decision))));
    const count = getScoringQueueStats().maxConcurrent;
    const jobs = Array.from({length:count+3},(_,n) => enqueueScoringJob({...job,responseId:String(n)}));
    expect(getScoringQueueStats()).toMatchObject({activeCount:count,queueDepth:3});
    await tick();
    expect(mocks.writing).toHaveBeenCalledTimes(count);
    resolvers.splice(0).forEach(resolve => resolve());
    await tick(); await tick();
    resolvers.splice(0).forEach(resolve => resolve());
    await Promise.all(jobs);
    expect(getScoringQueueStats()).toMatchObject({activeCount:0,queueDepth:0});
  });
});

it('recovers literal JSON writing without turning it into an audio object and isolates malformed tasks', async () => {
  mocks.many.mockResolvedValue([
    {...job,id:'invalid',item:{skill:'LISTENING',type:'INTEGRATED_TASK',content:{responseFormat:'spoken'}},metadata:{},value:'wrong response format'},
    {...job,id:'json-essay',item:{skill:'WRITING',type:'WRITING_PROMPT',content:{prompt:'Write a JSON example',rubric:job.rubric}},metadata:{},value:'{"topic":"my work"}'},
  ]);
  expect(await recoverPendingScoringJobs()).toBe(1);
  await drainScoringQueue(1000);
  expect(mocks.writing).toHaveBeenCalledWith('{"topic":"my work"}',expect.stringContaining('Write a JSON example'),undefined);
});

const recoveryRows = (count: number, prefix = 'recovery') => Array.from({length: count}, (_, n) => ({
  ...job, id: `${prefix}-${String(n).padStart(4, '0')}`, humanScore: null,
  item: {skill:'WRITING',type:'WRITING_PROMPT',content:{prompt:job.prompt,rubric:job.rubric}},
  metadata: {pendingAsyncScore:true},
}));
function persistedRecoveryRows(rows: ReturnType<typeof recoveryRows>) {
  mocks.many.mockImplementation(async ({where, take}) => rows
    .filter(row => row.metadata.pendingAsyncScore && (!where.id || row.id > where.id.gt)).slice(0,take));
  mocks.update.mockImplementation(async ({where,data}) => {
    const row = rows.find(row => row.id === where.id);
    if (row) row.metadata = data.metadata;
    return {count:1};
  });
}

it('eventually recovers every submission beyond the first 100 after a restart', async () => {
  const rows = recoveryRows(205);
  persistedRecoveryRows(rows);
  expect(await recoverPendingScoringJobs()).toBe(100);
  await drainScoringQueue(1000);
  expect(await recoverPendingScoringJobs()).toBe(100);
  await drainScoringQueue(1000);
  expect(await recoverPendingScoringJobs()).toBe(5);
  await drainScoringQueue(1000);
  expect(await recoverPendingScoringJobs()).toBe(0);
  expect(mocks.writing).toHaveBeenCalledTimes(205);
  expect(rows.every(row => row.metadata.pendingAsyncScore === false)).toBe(true);
});

it('continues past a full page of unusable records without blocking later tasks', async () => {
  const rows = recoveryRows(101);
  rows.slice(0,100).forEach(row => {row.item.skill='GRAMMAR';row.item.type='MULTIPLE_CHOICE';});
  persistedRecoveryRows(rows);
  expect(await recoverPendingScoringJobs()).toBe(1);
  await drainScoringQueue(1000);
  expect(mocks.writing).toHaveBeenCalledOnce();
  expect(mocks.many.mock.calls[1][0].where.id.gt).toBe(rows[99].id);
});

it('retains its scan position when more than 1000 unusable records precede a valid task', async () => {
  const rows = recoveryRows(1001);
  rows.slice(0,1000).forEach(row => {row.item.skill='GRAMMAR';row.item.type='MULTIPLE_CHOICE';});
  persistedRecoveryRows(rows);
  expect(await recoverPendingScoringJobs()).toBe(0);
  expect(mocks.many).toHaveBeenCalledTimes(10);
  expect(await recoverPendingScoringJobs()).toBe(1);
  await drainScoringQueue(1000);
  expect(mocks.writing).toHaveBeenCalledOnce();
});

it('shares overlapping recovery scans instead of queuing the same submissions twice', async () => {
  persistedRecoveryRows(recoveryRows(2));
  const first = recoverPendingScoringJobs();
  const second = recoverPendingScoringJobs();
  expect(second).toBe(first);
  expect(await first).toBe(2);
  await drainScoringQueue(1000);
  expect(mocks.many).toHaveBeenCalledOnce();
  expect(mocks.writing).toHaveBeenCalledTimes(2);
});

it('bounds the recovery backlog and resumes after active scoring finishes', async () => {
  const rows = recoveryRows(205);
  persistedRecoveryRows(rows);
  const resolvers: (() => void)[] = [];
  mocks.writing.mockImplementation(() => new Promise(resolve => resolvers.push(() => resolve(decision))));
  expect(await recoverPendingScoringJobs()).toBe(100);
  expect(await recoverPendingScoringJobs()).toBe(100);
  const queries = mocks.many.mock.calls.length;
  expect(await recoverPendingScoringJobs()).toBe(0);
  expect(mocks.many).toHaveBeenCalledTimes(queries);
  mocks.writing.mockResolvedValue(decision);
  await tick();
  resolvers.splice(0).forEach(resolve => resolve());
  await drainScoringQueue(2000);
  expect(await recoverPendingScoringJobs()).toBe(5);
  await drainScoringQueue(1000);
  // Complete the cursor cycle, allowing older submissions to be reconsidered.
  expect(await recoverPendingScoringJobs()).toBe(0);
  expect(rows.every(row => !row.metadata.pendingAsyncScore)).toBe(true);
});

it('retries a failed database scan on the next healthy probe', async () => {
  mocks.many.mockRejectedValueOnce(new Error('Database unavailable'));
  await expect(recoverPendingScoringJobs()).rejects.toThrow('Database unavailable');
  persistedRecoveryRows(recoveryRows(1));
  expect(await recoverPendingScoringJobs()).toBe(1);
  await drainScoringQueue(1000);
  expect(mocks.writing).toHaveBeenCalledOnce();
});

it('accepts a valid AI result after the old 30-second cutoff', async () => {
  vi.useFakeTimers();
  try {
    mocks.writing.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(decision), 59_000)));
    const submitted = enqueueScoringJob(job);
    await vi.advanceTimersByTimeAsync(59_000);
    expect(await submitted).toMatchObject({ score: .8, requiresHumanReview: false });
    expect(mocks.update.mock.calls[0][0].data).toMatchObject({ score: .8, metadata: { scoreFailed: false, aiUnavailable: false } });
    expect(mocks.enqueue).not.toHaveBeenCalled();
  } finally { vi.useRealTimers(); }
});
it('persists safe actionable provider categories without turning an outage into a grade', async () => {
  mocks.writing.mockResolvedValue({ ...decision, scoreSource: 'ai_unavailable', requiresHumanReview: true, failureCode: 'AI_RATE_LIMITED' });
  await enqueueScoringJob(job);
  expect(mocks.update.mock.calls[0][0].data).toMatchObject({ score: null, metadata: { failureCode: 'AI_RATE_LIMITED' } });
});

it('passes the authored target to the grader and persists context provenance', async () => {
 await enqueueScoringJob({...job,targetCefr:'A1'});
 expect(mocks.writing).toHaveBeenCalledWith(job.value,job.prompt,'A1');
 expect(mocks.update.mock.calls[0][0].data.metadata).toMatchObject({targetCefr:'A1',taskContextVersion:'2026-10-14.2',scoringPromptHash:expect.stringMatching(/^[a-f0-9]{64}$/)});
});
it('passes the target to both audio scoring and verification orchestration', async () => {
 const value = {audio:'YWJj',mimeType:'audio/webm'};
 await enqueueScoringJob({...job,skill:'SPEAKING',value,targetCefr:'A2'});
 expect(mocks.speaking).toHaveBeenCalledWith(value.audio,value.mimeType,job.prompt,undefined,'A2');
});
it('preserves target and rubric when rebuilding pending jobs after restart', async () => {
 const rows = recoveryRows(1,'target-context');
 Object.assign(rows[0].item, {cefrLevel:'A1',content:{prompt:'Describe your room.',rubric:{taskAchievement:{descriptor:'Describe two objects.'}}}});
 persistedRecoveryRows(rows);
 expect(await recoverPendingScoringJobs()).toBe(1);
 await drainScoringQueue(1000);
 expect(mocks.writing).toHaveBeenCalledWith('essay',expect.stringContaining('Describe two objects.'),'A1');
});

it.each([undefined, {}, 'X'.repeat(8001)])('holds invalid rubric without spending an AI call or recording zero credit', async rubric => {
 const result = await enqueueScoringJob({...job,rubric});
 expect(mocks.writing).not.toHaveBeenCalled(); expect(mocks.speaking).not.toHaveBeenCalled();
 expect(result).toMatchObject({requiresHumanReview:true,aiResult:null,scoreSource:'ai_flagged'});
 expect(mocks.update.mock.calls[0][0].data).toMatchObject({score:null,aiScore:null,isCorrect:null,metadata:{scoreFailed:false,aiUnavailable:false,requiresHumanReview:true,reviewReasons:expect.arrayContaining([expect.stringMatching(/^RUBRIC_/)]),rubricValidationVersion:'2026-10-14.2'}});
 expect(mocks.enqueue).toHaveBeenCalledOnce(); expect(mocks.refresh).toHaveBeenCalledWith(job.sessionId);
});
it('preserves human scores even when the original task rubric is invalid', async () => {
 mocks.find.mockResolvedValue({humanScore:.9,metadata:{scoreSource:'human'}});
 const result=await enqueueScoringJob({...job,rubric:undefined});
 expect(result).toMatchObject({score:.9,scoreSource:'human'});
 expect(mocks.update).not.toHaveBeenCalled();expect(mocks.enqueue).not.toHaveBeenCalled();
});
