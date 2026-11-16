import {randomUUID} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {beforeAll,afterAll,beforeEach,describe,it,expect,vi} from 'vitest';
const storage=vi.hoisted(()=>({remove:vi.fn(async (_ref:any)=>{})}));
vi.mock('../src/lib/storage/private-storage',async original=>({...await original<any>(),deletePrivateObject:storage.remove}));
import {runRetentionSweep} from '../src/lib/compliance/retention-sweep';
import {deleteOwnAccount,ACCOUNT_DELETION_CONFIRMATION} from '../src/lib/compliance/account-deletion';
import {drainErasureObjects,queueObjectErasure,legacyArtifactReference} from '../src/lib/compliance/erasure-storage';
import {replayErasureLedger} from '../src/lib/compliance/restore-erasure';
import {lockActiveCandidate} from '../src/lib/compliance/active-candidate';
import {storageReference} from '../src/lib/storage/private-storage';
const url=process.env.B4_RETENTION_TEST_DB_URL;
if(url){const parsed=new URL(url);if(!['localhost','127.0.0.1'].includes(parsed.hostname)||parsed.pathname!=='/all_exams_privacy')throw Error('Disposable all_exams_privacy localhost database required');}
describe.runIf(!!url)('retention and deletion on disposable PostgreSQL',()=>{
 const db=new PrismaClient({datasources:{db:{url:url || "postgresql://postgres@127.0.0.1:1/all_exams_privacy"}}});
 const now=new Date('2026-11-04T12:00:00Z');const ago=(days:number)=>new Date(now.getTime()-days*86400000);
 let org:string,user:string,item:string;
 beforeAll(async()=>{await db.$connect();});
 afterAll(async()=>{await db.$disconnect();vi.unstubAllEnvs();});
 beforeEach(async()=>{
  storage.remove.mockReset().mockResolvedValue(undefined);vi.stubEnv('LEGACY_RESPONSE_BUCKETS','owned');
  org=randomUUID();user=randomUUID();item=randomUUID();
  await db.organization.create({data:{id:org,name:'Synthetic privacy test',slug:org}});
  await db.user.create({data:{id:user,email:`${user}@example.test`,name:'Synthetic Person',role:'CANDIDATE',organizationId:org}});
  await db.item.create({data:{id:item,skill:'SPEAKING',type:'SPEAKING_PROMPT',cefrLevel:'B1',content:{prompt:'Synthetic task'},difficulty:0,discrimination:1}});
 });
 async function session(data:any={}){return db.session.create({data:{candidateId:user,organizationId:org,status:'COMPLETED',createdAt:ago(10),completedAt:ago(10),...data}});}
 async function response(sessionId:string,data:any={}){return db.response.create({data:{sessionId,itemId:item,order:1,value:JSON.stringify({audio:'AAAA',transcript:'Synthetic name'}),createdAt:ago(31),...data}});}
 const deps={reference:storageReference,deleteObject:storage.remove,verifyPassword:async()=>true,now:()=>now};
 async function sweep(apply=true){return runRetentionSweep(db,{apply,now,take:200});}
 it('dry run discovers inline audio but does not mutate records or call storage',async()=>{
  const s=await session();const r=await response(s.id);const before=await db.response.findUnique({where:{id:r.id}});
  const jobs=await db.erasureObject.count();const log=await db.erasureLedger.count();
  const result=await sweep(false);expect(result.eligible.audio).toBeGreaterThan(0);
  expect(await db.response.findUnique({where:{id:r.id}})).toEqual(before);
  expect(await db.erasureObject.count()).toBe(jobs);expect(await db.erasureLedger.count()).toBe(log);expect(storage.remove).not.toHaveBeenCalled();
 });
 it('keeps open reviews to 60 days, then erases audio and all rating copies without manufacturing a grade',async()=>{
  const s=await session();const young=await response(s.id,{createdAt:ago(40)});const old=await response(s.id,{createdAt:ago(61),order:2,score:.6,metadata:{pendingAsyncScore:true,transcript:'secret'}});
  await db.ratingTask.createMany({data:[young,old].map(r=>({responseId:r.id,status:'PENDING',feedback:'secret quote'}))});
  await sweep();expect((await db.response.findUniqueOrThrow({where:{id:young.id}})).value).not.toBeNull();
  const erased=await db.response.findUniqueOrThrow({where:{id:old.id}});expect(erased.value).toBeNull();expect(erased.contentErasedAt).toEqual(now);expect(erased.score).toBe(.6);
  expect(JSON.stringify(erased.metadata)).not.toContain('secret');expect(await db.ratingTask.count({where:{responseId:old.id}})).toBe(0);
  const stale=await db.response.updateMany({where:{id:old.id,contentErasedAt:null},data:{metadata:{transcript:'stale'}}});expect(stale.count).toBe(0);
 });
 it('uses identity capture time and caps camera retention while retrying failed object deletions',async()=>{
  const s=await session({createdAt:ago(100),metadata:{identitySnapshotKey:'identity/new.jpg',identitySnapshotProvider:'s3',identitySnapshotBucket:'owned',identitySnapshotAt:ago(1).toISOString()}});
  const event=await db.proctoringEvent.create({data:{sessionId:s.id,type:'SCREENSHOT',severity:1,timestamp:ago(8),metadata:{evidenceKey:'proctoring/old.jpg',evidenceProvider:'s3',evidenceBucket:'owned'}}});
  storage.remove.mockRejectedValue(new Error('offline'));
  const result=await sweep();expect(result.storage.failed).toBeGreaterThan(0);
  expect((await db.proctoringEvent.findUniqueOrThrow({where:{id:event.id}})).type).toBe('EVIDENCE_EXPIRED');
  expect((await db.session.findUniqueOrThrow({where:{id:s.id}})).metadata).toHaveProperty('identitySnapshotKey');
  storage.remove.mockResolvedValue(undefined);const retry=await drainErasureObjects(db,storage.remove,new Date(now.getTime()+3600000));expect(retry.failed).toBe(0);
  const done=await db.erasureObject.findMany({where:{deletedAt:{not:null}}});expect(done.every(row=>row.reference===null)).toBe(true);
 });
 it('erases a whole account including ratings, report quotes, feedback, audit copies; preserves another account',async()=>{
  const s=await session();const r=await response(s.id,{artifactUrl:'s3://owned/legacy/test.wav'});
  await db.ratingTask.create({data:{responseId:r.id,feedback:'Synthetic Person quote'}});
  await db.scoreReport.create({data:{sessionId:s.id,overallCefr:'B1',overallScore:50,isVerified:true,diagnosticReport:{signedCertificate:{name:'Synthetic Person'},transcript:'quoted answer'}}});
  await db.feedback.create({data:{sessionId:s.id,organizationId:org,rating:3,comment:'Synthetic Person'}});
  await db.auditLog.create({data:{userId:user,entityType:'Session',entityId:s.id,action:'TEST',details:{email:'personal@example.test'},previousData:{answer:'old'},newData:{answer:'new'}}});
  const outsider=await db.user.create({data:{email:`${randomUUID()}@example.test`,role:'CANDIDATE',organizationId:org}});
  const other=await session({candidateId:outsider.id});await response(other.id,{value:'Must remain'});
  storage.remove.mockRejectedValue(new Error('offline'));
  const result=await deleteOwnAccount(db,user,{confirm:ACCOUNT_DELETION_CONFIRMATION},deps);
  expect(result.deleted).toBe(true);expect(result.storageDeletionPending).not.toBe(0);
  for(const model of [db.session,db.response,db.scoreReport,db.ratingTask,db.feedback]) {
    const count= model===db.session ? await db.session.count({where:{id:s.id}}) : model===db.ratingTask ? await db.ratingTask.count({where:{responseId:r.id}}) : await (model as any).count({where:{sessionId:s.id}});
    expect(count).toBe(0);
  }
  expect((await db.user.findUniqueOrThrow({where:{id:user}})).email).toMatch(/@deleted.invalid$/);
  expect(JSON.stringify(await db.auditLog.findMany({where:{userId:user}}))).not.toContain('personal@example.test');
  expect(await db.response.count({where:{sessionId:other.id,value:'Must remain'}})).toBe(1);
  expect(await db.erasureLedger.count({where:{targetType:'USER',targetId:user}})).toBe(1);
 });
 it('uses completion date for the two year limit and keeps live holds without silently discarding unknown artifacts',async()=>{
  const old=await session({createdAt:ago(800),completedAt:ago(740)});await response(old.id,{value:'old essay'});
  const recent=await session({createdAt:ago(800),completedAt:ago(100)});
  const held=await session({createdAt:ago(800),completedAt:ago(740),metadata:{retentionHold:{owner:'privacy',reference:'case-1',until:ago(-1).toISOString()}}});
  const unknown=await session({createdAt:ago(800),completedAt:ago(740)});await response(unknown.id,{artifactUrl:'https://untrusted.example/file'});
  const result=await sweep();expect(result.errors).toBeGreaterThan(0);expect(result.held).toBeGreaterThan(0);
  expect(await db.session.findUnique({where:{id:old.id}})).toBeNull();
  for(const row of [recent,held,unknown])expect(await db.session.findUnique({where:{id:row.id}})).not.toBeNull();
 });
 it('does not erase held account data and rejects arbitrary external storage ownership',async()=>{
  const s=await session({metadata:{retentionHold:true}});
  await expect(deleteOwnAccount(db,user,{confirm:ACCOUNT_DELETION_CONFIRMATION},deps)).rejects.toMatchObject({code:'legal_hold'});
  expect(await db.session.findUnique({where:{id:s.id}})).not.toBeNull();
  expect(()=>legacyArtifactReference('s3://other/customer.wav')).toThrow('Unresolved');
 });
 it('does not let an old worker acknowledgement clear a newly queued deletion generation',async()=>{
  const ref={provider:'s3' as const,bucket:'owned',key:`race/${randomUUID()}`};await queueObjectErasure(db,ref);
  await drainErasureObjects(db,async seen=>{if(seen.key===ref.key)await queueObjectErasure(db,ref);},new Date(Date.now()+1000));
  const rows=await db.erasureObject.findMany({where:{deletedAt:null}});expect(rows.some(r=>(r.reference as any)?.key===ref.key)).toBe(true);
 });
 it('replays a preserved erasure ledger on a restored account before traffic is enabled',async()=>{
  const s=await session();await response(s.id,{value:'original sensitive text'});
  await deleteOwnAccount(db,user,{confirm:ACCOUNT_DELETION_CONFIRMATION},deps);
  await db.user.update({where:{id:user},data:{email:`${user}@restored.test`,name:'Restored name'}});
  await db.session.create({data:{id:s.id,organizationId:org,candidateId:user,status:'COMPLETED'}});
  await response(s.id,{value:'restored sensitive text'});
  const result=await replayErasureLedger(db,[{targetType:'USER',targetId:user}]);expect(result.replayed).toBe(1);
  expect(await db.session.findUnique({where:{id:s.id}})).toBeNull();
  expect((await db.user.findUniqueOrThrow({where:{id:user}})).email).toMatch(/@deleted.invalid$/);
  await expect(db.$transaction(tx=>lockActiveCandidate(tx,user))).rejects.toMatchObject({code:'ACCOUNT_ERASED'});
 });
 it('keyset pagination continues after the previous session row was deleted',async()=>{
  const first=await session({createdAt:ago(800),completedAt:ago(740)});const second=await session({createdAt:ago(800),completedAt:ago(740)});
  let cursors:any={camera:'__done__',identity:'__done__',audio:'__done__'};
  for(let page=0;page<100;page++) {
   const result=await runRetentionSweep(db,{apply:true,now,take:1,cursors});cursors=result.next;
   if(cursors.sessions==='__done__')break;
  }
  expect(await db.session.count({where:{id:{in:[first.id,second.id]}}})).toBe(0);
 });

});
