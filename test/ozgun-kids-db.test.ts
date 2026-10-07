/** Explicit opt-in: only disposable localhost PostgreSQL, never DATABASE_URL. */
import {randomUUID} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {createOzgunKidsService} from '../src/lib/fixed-forms/ozgun-kids-service';
import {OZGUN_PRODUCT} from '../src/lib/fixed-forms/ozgun-kids';
import {OZGUN_ANSWER_KEY} from '../src/lib/fixed-forms/ozgun-kids-key.server';
import express from 'express';
import {createOzgunKidsRouter} from '../src/routes/ozgun-kids';
const db=new PrismaClient({datasources:{db:{url:'postgresql://b4skills_test@127.0.0.1:59473/arbitration_test?connection_limit=3'}}});
const service=createOzgunKidsService(db),org=randomUUID(),candidate=randomUUID(),email=`${candidate}@disposable.test`;
let codeTime=0;
describe.runIf(process.env.B4SKILLS_ARBITRATION_DB_TEST==='1')('PostgreSQL fixed-form code -> answer -> raw report',()=>{
 beforeAll(async()=>{await db.organization.create({data:{id:org,name:'Disposable Özgün org',slug:org}});await db.user.create({data:{id:candidate,email,role:'CANDIDATE',organizationId:org}});});
 afterAll(async()=>{await db.$disconnect();});
 async function code(productLine=OZGUN_PRODUCT){return db.examCode.create({data:{code:randomUUID(),organizationId:org,productLine,isUsed:true,usedByEmail:email,usedAt:new Date(Date.now()+(++codeTime)*1000)}});}
 async function launch(){await code();return service.launch(candidate,org,'CANDIDATE',email);}
 it('requires the matching redeemed product code and excludes an unrelated code',async()=>{
  expect(await service.config(org)).toMatchObject({answerKey:OZGUN_ANSWER_KEY,confirmed:true});
  await expect(service.launch(candidate,org,'CANDIDATE',undefined as any)).rejects.toMatchObject({status:403});
  await expect(service.launch(candidate,org,'TEACHER',email)).rejects.toMatchObject({status:403});
  await code('General English');await expect(service.launch(candidate,org,'CANDIDATE',email)).rejects.toMatchObject({status:403});
 });
 it('creates one attempt for concurrent launches of a single-use code and hides the answer key',async()=>{
  await code();const launches=await Promise.all([service.launch(candidate,org,'CANDIDATE',email),service.launch(candidate,org,'CANDIDATE',email)]);
  expect(launches[0].sessionId).toBe(launches[1].sessionId);
  const view=await service.read(launches[0].sessionId);expect(view.status).toBe('SCHEDULED');expect(view.questions).toHaveLength(0);
  expect(JSON.stringify(view)).not.toContain(OZGUN_ANSWER_KEY);expect(view.report).toBeNull();
  const first=await service.start(view.sessionId),second=await service.start(view.sessionId);expect(second.sectionDeadline).toBe(first.sectionDeadline);
 });
 it('serializes answer patches, prevents closed/future answers and duplicate section advancement',async()=>{
  const session=await launch();await service.start(session.sessionId);
  await Promise.all([service.answer(session.sessionId,1,'B'),service.answer(session.sessionId,2,'D')]);
  expect((await service.read(session.sessionId)).answers).toEqual({'1':'B','2':'D'});
  await expect(service.answer(session.sessionId,25,'A')).rejects.toMatchObject({status:400});
  const moves=await Promise.allSettled([service.advance(session.sessionId,0),service.advance(session.sessionId,0)]);
  expect(moves.filter(m=>m.status==='fulfilled')).toHaveLength(1);
  expect((await service.read(session.sessionId)).sectionIndex).toBe(1);
  await expect(service.answer(session.sessionId,1,'A')).rejects.toMatchObject({status:400});
 });
 it('freezes the key for the attempt and completes 96-point reports without an IRT score or certificate',async()=>{
  await service.saveConfig(org,{answerKey:OZGUN_ANSWER_KEY,confirmed:false});
  const session=await launch();await service.start(session.sessionId);await service.answer(session.sessionId,1,'B');
  await service.saveConfig(org,{answerKey:'A'.repeat(96),confirmed:true});
  for(let sectionIndex=0;sectionIndex<4;sectionIndex++)await service.advance(session.sessionId,sectionIndex);
  const view=await service.read(session.sessionId);expect(view.status).toBe('COMPLETED');expect(view.report).toMatchObject({correct:1,blank:95,keyConfirmed:false,cefrLevel:null,certificateAvailable:false});
  expect(await db.scoreReport.findUnique({where:{sessionId:session.sessionId}})).toBeNull();
  expect((await db.session.findUniqueOrThrow({where:{id:session.sessionId}})).cefrLevel).toBeNull();
  const next=await launch();await service.start(next.sessionId);await service.answer(next.sessionId,1,'A');
  for(let i=0;i<4;i++)await service.advance(next.sessionId,i);
  expect((await service.read(next.sessionId)).report).toMatchObject({correct:1,keyConfirmed:true});
 });
 it('rejects late answers, expires all elapsed sections and never restarts the listening timeline',async()=>{
  const session=await launch();await service.start(session.sessionId);
  const stored=await db.session.findUniqueOrThrow({where:{id:session.sessionId}}),metadata=stored.metadata as any;
  metadata.fixedForm.sectionStartedAt=new Date(Date.now()-103*60000).toISOString();
  await db.session.update({where:{id:session.sessionId},data:{metadata}});
  const late=await service.answer(session.sessionId,1,'A');expect(late.status).toBe('COMPLETED');expect(late.answers).toEqual({});expect(late.report).toMatchObject({correct:0,blank:96});
  const listening=await launch();await service.start(listening.sessionId);for(let i=0;i<3;i++)await service.advance(listening.sessionId,i);
  const first=await service.listen(listening.sessionId),repeat=await service.listen(listening.sessionId);expect(first.listeningStartedAt).toBeTruthy();expect(repeat.listeningStartedAt).toBe(first.listeningStartedAt);
 });
 it('runs authenticated HTTP launch, answer persistence and reporting against PostgreSQL',async()=>{
  await code();
  const app=express();app.use(express.json());
  app.use('/api',createOzgunKidsRouter({prisma:db,databaseAvailable:()=>true,
   auth:(req:any,res:any,next:any)=>{if(!req.headers.authorization)return res.sendStatus(401);req.user={id:candidate,email,role:'CANDIDATE',organizationId:org};next();},
   checkRole:roles=>(req:any,res:any,next:any)=>roles.includes(req.user?.role)?next():res.sendStatus(403),
   assertOwnership:async(_req,res,id)=>{const session=await db.session.findUnique({where:{id}});const owns=session?.candidateId===candidate&&session.organizationId===org;if(!owns)res.sendStatus(403);return owns;}}));
  const server=await new Promise<import('node:http').Server>(resolve=>{const value=app.listen(0,'127.0.0.1',()=>resolve(value));});
  const base=`http://127.0.0.1:${(server.address() as any).port}/api`,headers={authorization:'fixture','Content-Type':'application/json'};
  try{
   expect((await fetch(base+'/fixed-forms/ozgun-kids/config',{headers})).status).toBe(403);
   const launched=await fetch(base+'/fixed-forms/ozgun-kids/launch',{method:'POST',headers,body:JSON.stringify({organizationId:org})});expect(launched.status).toBe(200);
   const {sessionId}=await launched.json(),endpoint=`${base}/sessions/${sessionId}/fixed-form`;
   expect((await fetch(endpoint)).status).toBe(401);
   expect((await fetch(`${base}/sessions/missing/fixed-form`,{headers})).status).toBe(403);
   const started=await fetch(endpoint+'/start',{method:'POST',headers,body:'{}'});expect((await started.json()).questions).toHaveLength(24);
   const answered=await fetch(endpoint+'/answer',{method:'POST',headers,body:JSON.stringify({number:1,answer:'A'})});expect(answered.status).toBe(200);
   expect(((await db.session.findUniqueOrThrow({where:{id:sessionId}})).metadata as any).fixedForm.answers).toEqual({'1':'A'});
   for(let sectionIndex=0;sectionIndex<4;sectionIndex++)expect((await fetch(endpoint+'/advance',{method:'POST',headers,body:JSON.stringify({sectionIndex})})).status).toBe(200);
   const result=await fetch(endpoint,{headers});expect((await result.json()).report).toMatchObject({correct:1,blank:95,keyConfirmed:true,cefrLevel:null,certificateAvailable:false});
  }finally{await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
 });
});
