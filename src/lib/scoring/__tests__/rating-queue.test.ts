import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({find:vi.fn(),many:vi.fn(),claim:vi.fn(),response:vi.fn(),refresh:vi.fn(),transaction:vi.fn()}));
vi.mock('../../prisma',()=>({prisma:{$transaction:mocks.transaction,ratingTask:{findUnique:mocks.find,findUniqueOrThrow:mocks.find,
  findMany:mocks.many,updateMany:mocks.claim},response:{update:mocks.response}}}));
vi.mock('../score-report-refresh',()=>({refreshScoredSession:mocks.refresh}));
import {RatingQueueService} from '../rating-queue';
const task={id:'task',score:.7,feedback:'First judgment',status:'CLAIMED',raterId:'first',secondRaterId:'second',
  secondRaterScore:null as number|null,secondRaterFeedback:null as string|null,requiresArbitration:false,arbitratorId:null as string|null,
  arbitrationScore:null as number|null,arbitrationFeedback:null as string|null,responseId:'response',
  response:{sessionId:'session',score:null as number|null,metadata:{requiresHumanReview:true,scoreFailed:true,scoringMode:'WRITING',reviewQueue:{aiResult:{score:.9}}}}};
let stored:typeof task;
beforeEach(()=>{
 vi.clearAllMocks();stored=structuredClone(task);
 mocks.find.mockImplementation(async()=>structuredClone(stored));mocks.response.mockResolvedValue({});mocks.refresh.mockResolvedValue(undefined);
 mocks.claim.mockImplementation(async({data})=>{stored={...stored,...data};return{count:1};});
 mocks.transaction.mockImplementation(async(callback)=>{
   const before=structuredClone(stored);
   try{return await callback({ratingTask:{findUnique:mocks.find,findUniqueOrThrow:mocks.find,updateMany:mocks.claim},response:{update:mocks.response}});}
   catch(error){stored=before;throw error;}
 });
});
function arbitration(){stored={...stored,status:'CLAIMED',secondRaterScore:.1,requiresArbitration:true,arbitratorId:'third'};}
describe('independent human rating',()=>{
 it('completes an agreeing second rating and refreshes the report after the transaction',async()=>{
  await RatingQueueService.submitSecondRating('task',.8,'Clear response','second');
  expect(mocks.response.mock.calls[0][0].data).toMatchObject({score:.75,humanScore:.75,adjustedScore:null,metadata:{scoreSource:'human',scoreFailed:false,aiUnavailable:true,requiresHumanReview:false,irrQwk:null}});
  expect(stored.status).toBe('COMPLETED');expect(mocks.refresh).toHaveBeenCalledWith('session');
 });
 it('withholds a disputed grade and marks the response for human review',async()=>{
  await RatingQueueService.submitSecondRating('task',.1,'Disagree','second');
  expect(stored).toMatchObject({status:'FLAGGED',requiresArbitration:true,secondRaterScore:.1});
  expect(mocks.response.mock.calls[0][0].data).toMatchObject({score:null,humanScore:null,metadata:{requiresHumanReview:true}});
 });
 it('does not flag the exact 0.20 boundary due to floating point error',async()=>{
  stored.score=.6;await RatingQueueService.submitSecondRating('task',.8,'Boundary','second');
  expect(stored.requiresArbitration).toBe(false);
 });
 it('rejects the first rater or unassigned callers from the second slot',async()=>{
  await expect(RatingQueueService.submitSecondRating('task',.8,'','first')).rejects.toThrow();
  await expect(RatingQueueService.submitSecondRating('task',.8,'','stranger')).rejects.toThrow();
 });
 it.each([80,-.1,NaN,Infinity])('rejects invalid normalized scores (%s)',async score=>{
  await expect(RatingQueueService.submitSecondRating('task',score,'','second')).rejects.toThrow();
  arbitration();await expect(RatingQueueService.submitArbitration('task',score,'','third')).rejects.toThrow();
 });
 it('hides the first grade from the second rater both before and after claiming',async()=>{
  mocks.many.mockResolvedValue([{...task,status:'PENDING'}]);
  expect((await RatingQueueService.getTasks('PENDING','second'))[0]).toMatchObject({score:null,feedback:null,needsSecondRater:true});
  expect(await RatingQueueService.claimSecondRating('task','second')).toMatchObject({score:null,feedback:null,needsSecondRater:true});
  mocks.many.mockResolvedValue([stored]);await RatingQueueService.getTasks('CLAIMED','second');
  expect(mocks.many.mock.calls.at(-1)![0].where.OR).toContainEqual({secondRaterId:'second',requiresArbitration:false});
 });
 it('prevents concurrent claims and submissions from overwriting a winner',async()=>{
  mocks.claim.mockResolvedValue({count:0});
  await expect(RatingQueueService.claimTask('task','first')).rejects.toThrow();
  await expect(RatingQueueService.claimSecondRating('task','second')).rejects.toThrow();
  await expect(RatingQueueService.submitSecondRating('task',.8,'','second')).rejects.toThrow();
  arbitration();await expect(RatingQueueService.claimArbitration('task','third')).rejects.toThrow();
  await expect(RatingQueueService.submitArbitration('task',.8,'','third')).rejects.toThrow();
  expect(mocks.response).not.toHaveBeenCalled();
 });
 it('claims arbitration only for a third independent user and hides previous human and AI evidence',async()=>{
  arbitration();stored.status='FLAGGED';stored.arbitratorId=null;
  const result=await RatingQueueService.claimArbitration('task','third');
  expect(mocks.claim.mock.calls[0][0].where).toMatchObject({status:'FLAGGED',arbitratorId:null,raterId:{not:'third'},secondRaterId:{not:'third'}});
  expect(result).toMatchObject({needsArbitration:true,score:null,feedback:null,secondRaterScore:null,secondRaterFeedback:null,raterId:null,secondRaterId:null});
  expect(result.response?.metadata).toEqual({scoringMode:'WRITING'});
 });
 it('keeps arbitration blind on reload and filters prior raters out of available tasks',async()=>{
  arbitration();mocks.many.mockResolvedValue([stored]);
  expect((await RatingQueueService.getTasks('CLAIMED','third'))[0]).toMatchObject({needsArbitration:true,score:null,secondRaterScore:null});
  await RatingQueueService.getTasks('FLAGGED','third');
  expect(mocks.many.mock.calls.at(-1)![0].where).toMatchObject({arbitratorId:null,raterId:{not:'third'},secondRaterId:{not:'third'}});
 });
 it('finalizes the mean of three independent grades and clears withheld evidence',async()=>{
  arbitration();await RatingQueueService.submitArbitration('task',.9,'Independent decision','third');
  expect(stored).toMatchObject({status:'COMPLETED',arbitrationScore:.9,arbitratorId:'third',requiresArbitration:true});
  expect(mocks.response.mock.calls[0][0].data).toMatchObject({score:expect.closeTo(1.7/3),humanScore:expect.closeTo(1.7/3),
    metadata:{scoreSource:'human',requiresHumanReview:false,scoreFailed:false,finalScoreSource:'three_independent_ratings_average'}});
  expect(mocks.refresh).toHaveBeenCalledWith('session');
 });
 it('rejects previous reviewers and an unassigned third reviewer',async()=>{
  arbitration();
  for(const id of ['first','second','stranger'])await expect(RatingQueueService.submitArbitration('task',.5,'',id)).rejects.toThrow();
 });
 it('rolls back task completion when response persistence fails',async()=>{
  arbitration();mocks.response.mockRejectedValueOnce(new Error('DB failure'));
  await expect(RatingQueueService.submitArbitration('task',.8,'','third')).rejects.toThrow('DB failure');
  expect(stored).toMatchObject({status:'CLAIMED',arbitrationScore:null});expect(mocks.refresh).not.toHaveBeenCalled();
 });
 it('allows an identical retry to repair report refresh without changing the committed grade',async()=>{
  arbitration();mocks.refresh.mockRejectedValueOnce(new Error('refresh failed'));
  await expect(RatingQueueService.submitArbitration('task',.8,'Decision','third')).rejects.toThrow();
  expect(stored.status).toBe('COMPLETED');await RatingQueueService.submitArbitration('task',.8,'Decision','third');
  expect(mocks.response).toHaveBeenCalledTimes(1);expect(mocks.refresh).toHaveBeenCalledTimes(2);
  await expect(RatingQueueService.submitArbitration('task',.9,'Changed','third')).rejects.toThrow();
 });
 it('saves the first score only once using the assigned slot guard',async()=>{
  stored={...stored,score:null,secondRaterId:null as any};
  await RatingQueueService.submitRating('task',.7,'First judgment','first');
  expect(mocks.claim.mock.calls[0][0].where).toMatchObject({status:'CLAIMED',score:null,raterId:'first',secondRaterId:null,arbitratorId:null});
  expect(mocks.response).not.toHaveBeenCalled();
 });
});
