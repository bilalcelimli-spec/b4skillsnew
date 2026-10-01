import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  writing: vi.fn(), speaking: vi.fn(), speakingText: vi.fn(), update: vi.fn(), enqueue: vi.fn(), refresh: vi.fn(),
}));
vi.mock('../../prisma', () => ({prisma:{response:{update:mocks.update}}}));
vi.mock('../scoring-orchestrator', () => ({ScoringOrchestrator:{scoreWriting:mocks.writing,scoreSpeaking:mocks.speaking,scoreSpeakingFromText:mocks.speakingText}}));
vi.mock('../rating-queue', () => ({RatingQueueService:{enqueue:mocks.enqueue}}));
vi.mock('../score-report-refresh', () => ({refreshScoredSession:mocks.refresh}));
vi.mock('../../observability/index', () => ({logger:{debug:vi.fn(),warn:vi.fn(),error:vi.fn()}}));
import { enqueueScoringJob, getScoringQueueStats, isScoringJobPending } from '../scoring-queue';
const decision = {score:.8,requiresHumanReview:false,scoreSource:'ai_auto',aiResult:{score:.8,feedback:'Good'},reviewReasons:[],scoringPasses:[]};
const job = {sessionId:'session',responseId:'response',itemId:'item',skill:'WRITING' as const,value:'essay',prompt:'Write an essay'};
const tick = () => new Promise(resolve => setImmediate(resolve));
beforeEach(() => {
  vi.clearAllMocks();
  mocks.update.mockResolvedValue({}); mocks.enqueue.mockResolvedValue('task'); mocks.refresh.mockResolvedValue(undefined);
  mocks.writing.mockResolvedValue(decision); mocks.speaking.mockResolvedValue(decision);
});
describe('background scoring persistence', () => {
  it('persists real scores and refreshes the session and completed report', async () => {
    await enqueueScoringJob(job);
    expect(mocks.update.mock.calls[0][0].data).toMatchObject({score:.8,adjustedScore:null,isCorrect:true,metadata:{asyncScored:true,pendingAsyncScore:false,requiresHumanReview:false}});
    expect(mocks.refresh).toHaveBeenCalledWith('session');
    expect(getScoringQueueStats().activeCount).toBe(0);
  });
  it('withholds the AI outage placeholder instead of recording it as a grade', async () => {
    mocks.writing.mockResolvedValue({...decision,score:.5,scoreSource:'ai_unavailable',requiresHumanReview:true});
    await enqueueScoringJob(job);
    expect(mocks.update.mock.calls[0][0].data).toMatchObject({score:null,isCorrect:null,aiScore:null,metadata:{scoreFailed:true,requiresHumanReview:true}});
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
