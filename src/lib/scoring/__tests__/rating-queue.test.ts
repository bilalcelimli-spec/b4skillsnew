import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({find:vi.fn(),many:vi.fn(),update:vi.fn(),claim:vi.fn(),response:vi.fn(),refresh:vi.fn()}));
vi.mock('../../prisma',()=>({prisma:{ratingTask:{findUnique:mocks.find,findMany:mocks.many,update:mocks.update,updateMany:mocks.claim},response:{update:mocks.response}}}));
vi.mock('../score-report-refresh',()=>({refreshScoredSession:mocks.refresh}));
import {RatingQueueService} from '../rating-queue';
const task={id:'task',score:.7,status:'CLAIMED',raterId:'first',secondRaterId:'second',responseId:'response',response:{sessionId:'session',metadata:{requiresHumanReview:true,scoreFailed:true}}};
beforeEach(()=>{vi.clearAllMocks();mocks.find.mockResolvedValue(task);mocks.update.mockResolvedValue(task);mocks.response.mockResolvedValue({});mocks.refresh.mockResolvedValue(undefined);mocks.claim.mockResolvedValue({count:1});});
describe('human rating completion',()=>{
 it('completes an independent second rating and replaces unresolved evidence',async()=>{
  await RatingQueueService.submitSecondRating('task',.8,'Clear response','second');
  expect(mocks.response.mock.calls[0][0].data).toMatchObject({score:.75,humanScore:.75,adjustedScore:null,metadata:{scoreSource:'human',scoreFailed:false,requiresHumanReview:false,irrQwk:null}});
  expect(mocks.refresh).toHaveBeenCalledWith('session');
 });
 it('withholds disagreement instead of replacing the provisional grade',async()=>{
  await RatingQueueService.submitSecondRating('task',.1,'Disagree','second');
  expect(mocks.response).not.toHaveBeenCalled();expect(mocks.update.mock.calls[0][0].data.requiresArbitration).toBe(true);
 });
 it('rejects the first rater or unassigned callers in the second-rater slot',async()=>{
  await expect(RatingQueueService.submitSecondRating('task',.8,'','first')).rejects.toThrow();
  await expect(RatingQueueService.submitSecondRating('task',.8,'','stranger')).rejects.toThrow();
 });
 it('rejects percentage values on the normalized grading scale',async()=>{
  await expect(RatingQueueService.submitSecondRating('task',80,'','second')).rejects.toThrow();
 });
 it('hides the first grade while telling the interface a second rater is needed',async()=>{
  mocks.many.mockResolvedValue([{...task,status:'PENDING',feedback:'First judgment'}]);
  expect((await RatingQueueService.getTasks('PENDING','second'))[0]).toMatchObject({score:null,feedback:null,needsSecondRater:true});
 });
 it('prevents two raters from claiming the same slot',async()=>{
  mocks.claim.mockResolvedValue({count:0});
  await expect(RatingQueueService.claimTask('task','first')).rejects.toThrow();
  await expect(RatingQueueService.claimSecondRating('task','second')).rejects.toThrow();
 });
});
