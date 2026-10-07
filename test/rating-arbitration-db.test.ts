/** Opt-in test against the disposable localhost cluster used for this audit. Never uses DATABASE_URL. */
import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest';
const state=await vi.hoisted(async()=>{
 const {PrismaClient}=await import('@prisma/client');
 return {client:new PrismaClient({datasources:{db:{url:'postgresql://b4skills_test@127.0.0.1:59473/arbitration_test'}}})};
});
vi.mock('../src/lib/prisma',()=>({prisma:state.client}));
import {RatingQueueService} from '../src/lib/scoring/rating-queue';
const db=state.client;
const orgId=`arbitration-${randomUUID()}`,candidateId=`candidate-${randomUUID()}`;
let itemId:string;
describe.runIf(process.env.B4SKILLS_ARBITRATION_DB_TEST==='1')('PostgreSQL independent arbitration',()=>{
 beforeAll(async()=>{
  await db.organization.create({data:{id:orgId,name:'Disposable test org',slug:randomUUID()}});
  await db.user.createMany({skipDuplicates:true,data:[candidateId,'first','second','third','fourth'].map(id=>({id,email:`${id}-${orgId}@arbitration.test`,organizationId:orgId,role:id===candidateId?'CANDIDATE':'RATER'}))});
  const item=await db.item.create({data:{type:'WRITING_PROMPT',skill:'WRITING',cefrLevel:'A2',content:{prompt:'Write an email'},tags:[],status:'ACTIVE'}});itemId=item.id;
 });
 afterAll(async()=>{await db.$disconnect();});
 async function pendingTask(){
  const session=await db.session.create({data:{organizationId:orgId,candidateId,status:'COMPLETED',completedAt:new Date(),metadata:{productLine:'Corporate'}}});
  const response=await db.response.create({data:{sessionId:session.id,itemId,order:1,value:'An actual written response',score:null,
   metadata:{requiresHumanReview:true,scoreFailed:true,scoringMode:'WRITING'}}});
  const task=await db.ratingTask.create({data:{responseId:response.id}});return{task,response,session};
 }
 async function disputed(){
  const records=await pendingTask();const id=records.task.id;
  await RatingQueueService.claimTask(id,'first');await RatingQueueService.submitRating(id,.9,'First independent grade','first');
  await RatingQueueService.claimSecondRating(id,'second');await RatingQueueService.submitSecondRating(id,.1,'Second independent grade','second');
  return records;
 }
 it('completes three independent stages and refreshes the actual assessment report',async()=>{
  const {task,response,session}=await disputed();
  expect((await db.response.findUniqueOrThrow({where:{id:response.id}})).score).toBeNull();
  await expect(RatingQueueService.claimArbitration(task.id,'first')).rejects.toThrow();
  await expect(RatingQueueService.claimArbitration(task.id,'second')).rejects.toThrow();
  const claimed=await RatingQueueService.claimArbitration(task.id,'third');
  expect(claimed).toMatchObject({score:null,secondRaterScore:null,needsArbitration:true});
  await RatingQueueService.submitArbitration(task.id,.8,'Third independent grade','third');
  const saved=await db.response.findUniqueOrThrow({where:{id:response.id}});
  expect(saved.score).toBeCloseTo(.6);expect(saved.humanScore).toBeCloseTo(.6);
  expect(saved.metadata).toMatchObject({scoreSource:'human',requiresHumanReview:false,scoreFailed:false});
  const report=await db.scoreReport.findUniqueOrThrow({where:{sessionId:session.id}});
  expect(report.writingScore).not.toBeNull();expect(report.isVerified).toBe(false); // One skill cannot certify a complete assessment.
  expect((await db.ratingTask.findUniqueOrThrow({where:{id:task.id}})).status).toBe('COMPLETED');
 });
 it('grants exactly one concurrent arbitration claim and prevents losing reviewers from submitting',async()=>{
  const {task}=await disputed();
  const outcomes=await Promise.allSettled(['third','fourth'].map(id=>RatingQueueService.claimArbitration(task.id,id)));
  expect(outcomes.filter(result=>result.status==='fulfilled')).toHaveLength(1);
  const saved=await db.ratingTask.findUniqueOrThrow({where:{id:task.id}});
  const loser=saved.arbitratorId==='third'?'fourth':'third';
  await expect(RatingQueueService.submitArbitration(task.id,.8,'Unauthorized decision',loser)).rejects.toThrow();
  expect((await db.response.findUniqueOrThrow({where:{id:task.responseId}})).score).toBeNull();
 });
 it('commits one concurrent submission and preserves the winning grade on retry',async()=>{
  const {task,response}=await disputed();await RatingQueueService.claimArbitration(task.id,'third');
  const scores=[.7,.8];const outcomes=await Promise.allSettled(scores.map(score=>RatingQueueService.submitArbitration(task.id,score,`Decision ${score}`,'third')));
  expect(outcomes.filter(result=>result.status==='fulfilled')).toHaveLength(1);
  const saved=await db.ratingTask.findUniqueOrThrow({where:{id:task.id}});
  expect((await db.response.findUniqueOrThrow({where:{id:response.id}})).score).toBeCloseTo((1+saved.arbitrationScore!)/3);
  await RatingQueueService.submitArbitration(task.id,saved.arbitrationScore!,saved.arbitrationFeedback!,'third');
  await expect(RatingQueueService.submitArbitration(task.id,.2,'Change committed grade','third')).rejects.toThrow();
 });
 it('accepts only one submission for each of the first two slots under concurrency',async()=>{
  const {task,response}=await pendingTask();await RatingQueueService.claimTask(task.id,'first');
  const first=await Promise.allSettled([.8,.9].map(score=>RatingQueueService.submitRating(task.id,score,`First ${score}`,'first')));
  expect(first.filter(result=>result.status==='fulfilled')).toHaveLength(1);
  await RatingQueueService.claimSecondRating(task.id,'second');
  const second=await Promise.allSettled([.1,.2].map(score=>RatingQueueService.submitSecondRating(task.id,score,`Second ${score}`,'second')));
  expect(second.filter(result=>result.status==='fulfilled')).toHaveLength(1);
  expect((await db.ratingTask.findUniqueOrThrow({where:{id:task.id}})).status).toBe('FLAGGED');
  expect((await db.response.findUniqueOrThrow({where:{id:response.id}})).score).toBeNull();
 });
 it('rolls back task completion when PostgreSQL rejects the response update',async()=>{
  const {task,response}=await disputed();await RatingQueueService.claimArbitration(task.id,'third');
  await db.$executeRawUnsafe(`CREATE FUNCTION reject_arbitration_test() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id = '${response.id}' THEN RAISE EXCEPTION 'forced test persistence failure'; END IF; RETURN NEW; END $$`);
  await db.$executeRawUnsafe('CREATE TRIGGER reject_arbitration_test BEFORE UPDATE ON "Response" FOR EACH ROW EXECUTE FUNCTION reject_arbitration_test()');
  try {
   await expect(RatingQueueService.submitArbitration(task.id,.8,'DB should reject this','third')).rejects.toThrow();
   expect(await db.ratingTask.findUniqueOrThrow({where:{id:task.id}})).toMatchObject({status:'CLAIMED',arbitrationScore:null});
   expect((await db.response.findUniqueOrThrow({where:{id:response.id}})).score).toBeNull();
  } finally {
   await db.$executeRawUnsafe('DROP TRIGGER reject_arbitration_test ON "Response"');
   await db.$executeRawUnsafe('DROP FUNCTION reject_arbitration_test()');
  }
 });
});
