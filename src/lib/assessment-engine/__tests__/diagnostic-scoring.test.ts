import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({find:vi.fn(),update:vi.fn(),item:vi.fn(),create:vi.fn(),count:vi.fn(),lock:vi.fn(),grade:vi.fn(),enqueue:vi.fn()}));
vi.mock('../../prisma',()=>({prisma:{session:{findUnique:mocks.find,update:mocks.update},item:{findUnique:mocks.item},response:{create:mocks.create,count:mocks.count},$transaction:async(fn:any)=>fn({session:{findUnique:mocks.find,update:mocks.update},response:{create:mocks.create,count:mocks.count},$queryRaw:mocks.lock})}}));
vi.mock('../../product-lines/freemium-productive-scoring',()=>({evaluateFreemiumResponse:mocks.grade}));
vi.mock('../../scoring/rating-queue',()=>({RatingQueueService:{enqueue:mocks.enqueue}}));
import {DiagnosticService,SKILLS} from '../diagnostic-service';
beforeEach(()=>vi.clearAllMocks());
function fixture(){
 const skills=Object.fromEntries(SKILLS.map(skill=>[skill,{theta:0,sem:1,answered:skill==='WRITING'?4:5,items:Array.from({length:5},(_,n)=>({itemId:`${skill}-${n}`,skill,type:skill==='WRITING'?'WRITING_PROMPT':'MULTIPLE_CHOICE',irtA:1,irtB:0,irtC:0,cefrLevel:'B1',answered:skill!=='WRITING'||n<4,score:skill==='WRITING'&&n===4?undefined:0}))}]));
 let session:any={id:'session',metadata:{diagnosticState:{sessionId:'session',candidateId:'candidate',orgId:'org',startedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+600000).toISOString(),totalAnswered:29,complete:false,skills}}};
 mocks.find.mockImplementation(async()=>structuredClone(session));
 mocks.update.mockImplementation(async({data}:any)=>{session={...session,...data};return structuredClone(session)});
 mocks.item.mockResolvedValue({id:'WRITING-4',skill:'WRITING',type:'WRITING_PROMPT',content:{prompt:'Describe your family.'}});
 mocks.count.mockResolvedValue(0);mocks.create.mockResolvedValue({id:'response'});mocks.enqueue.mockResolvedValue('rating');
}
describe('diagnostic grading uses scored evidence',()=>{
 it('does not mark a one-word writing response as correct or use the old half-credit placeholder',async()=>{
  fixture();mocks.grade.mockResolvedValue({score:0,kind:'rubric',status:'scored',feedback:'Below minimum length'});
  const result=await DiagnosticService.respond('session','WRITING-4','hello',10000);
  expect(mocks.create.mock.calls[0][0].data).toMatchObject({score:0,isCorrect:false,value:'hello'});
  expect(result.skillThetas.WRITING.theta).toBeLessThan(0);
  expect(result.complete).toBe(true);
 });
 it('withholds unavailable or disputed scores and sends them to human review',async()=>{
  fixture();mocks.grade.mockResolvedValue({score:null,kind:'rubric',status:'unavailable'});
  await DiagnosticService.respond('session','WRITING-4','An essay',10000);
  expect(mocks.create.mock.calls[0][0].data).toMatchObject({score:null,isCorrect:null,metadata:{requiresHumanReview:true}});
  expect(mocks.enqueue).toHaveBeenCalledOnce();
 });
});
