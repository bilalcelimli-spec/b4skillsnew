/** Opt-in disposable localhost DB only; never reads DATABASE_URL. */
import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,describe,expect,it,vi} from 'vitest';
const state=await vi.hoisted(async()=>{const {PrismaClient}=await import('@prisma/client');return{client:new PrismaClient({datasources:{db:{url:'postgresql://b4skills_test@127.0.0.1:59473/arbitration_test?connection_limit=3'}}})};});
vi.mock('../src/lib/prisma',()=>({prisma:state.client}));
import * as productiveScoring from '../src/lib/product-lines/freemium-productive-scoring';
import {DiagnosticService,SKILLS} from '../src/lib/assessment-engine/diagnostic-service';
import {RatingQueueService} from '../src/lib/scoring/rating-queue';
import {ensureReportShareToken} from '../src/lib/reporting/report-sharing';
import {CertificateService} from '../src/lib/certification/certificate-service';
import {buildCertificatePayload,issueCertificate,storeCertificate,lookupCertificate,verifyCertificate as verifySignature} from '../src/lib/certificates/blockchain-cert';
const db=state.client,orgId=randomUUID(),candidateId=randomUUID(),first=randomUUID(),second=randomUUID();
let items:Array<{id:string,skill:string}>;
describe.runIf(process.env.B4SKILLS_ARBITRATION_DB_TEST==='1')('PostgreSQL diagnostic -> independent review -> certificate',()=>{
 beforeAll(async()=>{
  await db.organization.create({data:{id:orgId,name:'Disposable diagnostic org',slug:orgId}});
  await db.user.createMany({data:[candidateId,first,second].map(id=>({id,email:`${id}@disposable.test`,name:id===candidateId?'Stored Candidate':'Rater',organizationId:orgId,role:id===candidateId?'CANDIDATE':'RATER'}))});
  items=[];
  for(const skill of SKILLS)for(let n=0;n<5;n++){
   const item=await db.item.create({data:{skill,type:['WRITING','SPEAKING'].includes(skill)?'WRITING_PROMPT':'MULTIPLE_CHOICE',cefrLevel:'B1',content:{prompt:'Test prompt',options:['a','b'],correctAnswer:'A'},tags:[],status:'ACTIVE',difficulty:0,discrimination:1,guessing:0}});
   items.push(item);
  }
 });
 afterAll(async()=>{await db.$disconnect();});
 async function makeSession(expired=false){
  const skills=Object.fromEntries(SKILLS.map(skill=>[skill,{theta:0,sem:1,answered:expired?0:5,items:items.filter(item=>item.skill===skill).map(item=>({itemId:item.id,skill,type:['WRITING','SPEAKING'].includes(skill)?'WRITING_PROMPT':'MULTIPLE_CHOICE',irtA:1,irtB:0,irtC:0,cefrLevel:'B1',answered:!expired,score:null}))}]));
  return db.session.create({data:{organizationId:orgId,candidateId,status:expired?'IN_PROGRESS':'SCORING',theta:-3,startedAt:new Date(Date.now()-3600000),completedAt:expired?null:new Date(),
   metadata:{sessionType:'DIAGNOSTIC',diagnosticState:{sessionId:'pending',candidateId,orgId,startedAt:new Date(Date.now()-3600000).toISOString(),expiresAt:new Date(Date.now()-60000).toISOString(),totalAnswered:expired?0:30,complete:!expired,skills}}}});
 }
 it('blocks certification until final human grades, then persists and verifies an authoritative certificate',async()=>{
  const session=await makeSession();const pending=items.find(item=>item.skill==='WRITING')!;
  await db.response.createMany({data:items.map((item,index)=>({sessionId:session.id,itemId:item.id,order:index+1,score:item.id===pending.id?null:.8,aiScore:.8,value:'Recorded response',metadata:item.id===pending.id?{requiresHumanReview:true,scoreSource:'ai_flagged'}:{scoreSource:'ai_auto'}}))});
  const response=await db.response.findFirstOrThrow({where:{sessionId:session.id,itemId:pending.id}});
  const task=await db.ratingTask.create({data:{responseId:response.id}});
  await DiagnosticService.refreshScoring(session.id);
  expect((await db.scoreReport.findUniqueOrThrow({where:{sessionId:session.id}})).isVerified).toBe(false);
  await expect(CertificateService.generateCertificate({sessionId:session.id,theta:4,cefr:'C2'},null,null)).rejects.toThrow();
  await expect(DiagnosticService.getReport(session.id)).rejects.toThrow();
  await RatingQueueService.claimTask(task.id,first);await RatingQueueService.submitRating(task.id,.8,'First independent decision',first);
  await RatingQueueService.claimSecondRating(task.id,second);await RatingQueueService.submitSecondRating(task.id,.8,'Second independent decision',second);
  const stored=await db.session.findUniqueOrThrow({where:{id:session.id},include:{scoreReport:true}});
  expect(stored.status).toBe('COMPLETED');expect(stored.theta).toBeGreaterThan(0);expect(stored.scoreReport!.isVerified).toBe(true);
  const report=await DiagnosticService.getReport(session.id);expect(report.overallTheta).toBeCloseTo(stored.theta);
  const certificate=await CertificateService.generateCertificate({sessionId:session.id,theta:4,cefr:'C2'},{name:'Injected'},{});
  expect(certificate).toMatchObject({candidateName:'Stored Candidate',overallScore:stored.scoreReport!.overallScore,cefrLevel:stored.scoreReport!.overallCefr,theta:stored.theta});
  expect(await CertificateService.verifyCertificate(certificate.id)).not.toBeNull();
  const payload=buildCertificatePayload({candidateId:certificate.candidateId,candidateName:certificate.candidateName,organizationId:certificate.organizationId,organizationName:certificate.organizationName,
   sessionId:session.id,cefrLevel:certificate.cefrLevel,overallScore:certificate.overallScore,skillScores:Object.fromEntries(Object.entries(certificate.skillScores).map(([skill,score])=>[skill.toUpperCase(),score!]))});
  payload.id=certificate.id;payload.issuedAt=certificate.issuedAt.toISOString();payload.expiresAt=certificate.expiresAt.toISOString();
  await storeCertificate(issueCertificate(payload));
  expect(verifySignature((await lookupCertificate(certificate.id))!).valid).toBe(true);
  const persisted=await db.scoreReport.findUniqueOrThrow({where:{id:certificate.id}});expect((persisted.diagnosticReport as any).signedCertificate.payload.id).toBe(certificate.id);
  const tokens=await Promise.all([ensureReportShareToken(session.id),ensureReportShareToken(session.id)]);
  expect(tokens[0]).toBeTruthy();expect(tokens[1]).toBe(tokens[0]);
  await DiagnosticService.refreshScoring(session.id);
  expect(await ensureReportShareToken(session.id)).toBe(tokens[0]);
  expect(await CertificateService.verifyCertificate(certificate.id)).not.toBeNull();
  expect(verifySignature((await lookupCertificate(certificate.id))!).valid).toBe(true);
  const grammar=items.find(item=>item.skill==='GRAMMAR')!;
  await db.response.deleteMany({where:{sessionId:session.id,itemId:grammar.id}});
  await DiagnosticService.refreshScoring(session.id);
  expect(await CertificateService.verifyCertificate(certificate.id)).toBeNull();
  expect(await lookupCertificate(certificate.id)).toBeNull();
 });
 it('rejects an answer when the deadline passes during grading',async()=>{
  const session=await makeSession(true);
  const meta=session.metadata as any;
  await db.session.update({where:{id:session.id},data:{metadata:{...meta,diagnosticState:{...meta.diagnosticState,expiresAt:new Date(Date.now()+60000).toISOString()}}}});
  const spy=vi.spyOn(productiveScoring,'evaluateFreemiumResponse').mockImplementationOnce(async()=>{
   const current=await db.session.findUniqueOrThrow({where:{id:session.id}});const metadata=current.metadata as any;
   await db.session.update({where:{id:session.id},data:{metadata:{...metadata,diagnosticState:{...metadata.diagnosticState,expiresAt:new Date(Date.now()-1).toISOString()}}}});
   return {kind:'objective',score:1,scoreSource:'objective'} as any;
  });
  try {
   await expect(DiagnosticService.respond(session.id,items[0].id,'A',100)).rejects.toThrow('time limit');
   expect(await db.response.count({where:{sessionId:session.id}})).toBe(0);
   const stored=await db.session.findUniqueOrThrow({where:{id:session.id}});
   expect((stored.metadata as any).diagnosticState.complete).toBe(true);
  } finally {spy.mockRestore();}
 });
 it('rejects a late answer before grading or persisting any response',async()=>{
  const session=await makeSession(true);
  await expect(DiagnosticService.respond(session.id,items[0].id,'late answer',100)).rejects.toThrow('time limit');
  expect(await db.response.count({where:{sessionId:session.id}})).toBe(0);
  const stored=await db.session.findUniqueOrThrow({where:{id:session.id},include:{scoreReport:true}});
  expect(stored.status).toBe('SCORING');expect(stored.completedAt).not.toBeNull();expect(stored.scoreReport!.isVerified).toBe(false);
 });
});
