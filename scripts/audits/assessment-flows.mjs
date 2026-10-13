/** Disposable localhost DB only. Run after migrating and seeding CI fixtures. */
import {PrismaClient} from '@prisma/client';
import jwt from 'jsonwebtoken';
import {spawn} from 'node:child_process';
import {openSync,closeSync,readFileSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const database=process.env.B4SKILLS_FLOW_AUDIT_DATABASE_URL??'postgresql://b4skills_test@127.0.0.1:59473/all_exams_20261007?connection_limit=3';
const parsed=new URL(database);
if(!['localhost','127.0.0.1'].includes(parsed.hostname)||!/^\/all_exams_/.test(parsed.pathname))throw Error('Only a disposable localhost all_exams_ database is allowed.');
const db=new PrismaClient({datasources:{db:{url:database}}});
const secret='disposable-all-exam-flow-audit-secret-not-for-any-live-service';
const base='http://127.0.0.1:39482',org=randomUUID(),admin=randomUUID();
const products=['Primary (7-10)','Junior Suite (11-14)','15-Min Diagnostic','Express Assessment (30-Min)','General English','Academia','Corporate','Language Schools','Specialized / Integrated Skills'];
const results=[],audio={audio:readFileSync('public/assessments/ozgun-kids/form-a-v1/Listening_01_Sorular_73-76.mp3').toString('base64'),mimeType:'audio/mpeg'};
let child,log;
async function request(path,body,cookie,method=body===undefined?'GET':'POST'){
 const response=await fetch(base+path,{method,headers:{'user-agent':'B4SkillsLocalAudit','Content-Type':'application/json',...(cookie?{cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(55000)});
 const type=response.headers.get('content-type')??'';const data=method==='HEAD'?null:type.includes('json')?await response.json():await response.arrayBuffer();return {response,data};
}
async function ok(path,body,cookie,method){const {response,data}=await request(path,body,cookie,method);assert(response.ok,`${path}: ${response.status} ${JSON.stringify(data)}`);return data;}
async function check(name,fn){try{await fn();results.push({name,passed:true});console.log('PASS',name);}catch(error){results.push({name,passed:false,error:error.message});console.log('FAIL',name,error.message);}}
async function candidate(product){const {codes}=await ok('/api/codes/generate',{organizationId:org,productLine:product,quantity:1},staff);
 const {response,data}=await request('/api/codes/redeem',{code:codes[0],email:`${randomUUID()}@local-audit.test`,name:'Audit',surname:'Candidate'});assert(response.ok,JSON.stringify(data));
 return {id:data.candidateId,cookie:response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ')};
}
async function verifyLockedAttempt(id,cookie){
 const prefix=`/api/sessions/${id}`;
 const before=await db.session.findUniqueOrThrow({where:{id},include:{responses:true}});
 const meta=before.metadata,diagnostic=meta.sessionType==='DIAGNOSTIC',fixed=meta.sessionType==='FIXED_FORM';
 const actions=fixed?[
  [prefix+'/fixed-form/start',{}],
  [prefix+'/fixed-form/answer',{number:1,answer:'A'}],
  [prefix+'/fixed-form/advance',{sectionIndex:0}],
  [prefix+'/fixed-form/listen',{}],
 ]:[
  [prefix+'/next',undefined],
  [prefix+'/respond',{itemId:diagnostic?Object.values(meta.diagnosticState.skills)[0].items[0].itemId:meta.currentItemId,value:'A',latencyMs:1000}],
 ];
 if(diagnostic){
  actions.push([`/api/sessions/diagnostic/${id}/respond`,actions[1][1]]);
  actions.push([`/api/sessions/diagnostic/${id}/report`,undefined]);
 }
 actions.push([prefix+'/complete',{}]);
 for(const [path,body] of actions){
  const {response}=await request(path,body,cookie);
  assert.equal(response.status,409,`${before.status} blocks ${path} with a state conflict`);
 }
 if(fixed){const view=await request(prefix+'/fixed-form',undefined,cookie);
  if(before.status==='PAUSED'){assert.equal(view.response.status,200);assert.equal(view.data.questions.length,0,'Paused form reveals no questions');}
  else assert.equal(view.response.status,409,'Expired form is inaccessible');
 }
 const after=await db.session.findUniqueOrThrow({where:{id},include:{responses:true}});
 assert.equal(after.status,before.status,'Blocked operations preserve lifecycle');
 assert.deepEqual(after.metadata,before.metadata,'Blocked operations preserve progress and clocks');
 assert.equal(after.responses.length,before.responses.length,'Blocked operations create no responses');
 assert.equal(await db.scoreReport.count({where:{sessionId:id}}),0,'Blocked operations cannot create a final report');
}
async function verifyPause(id,cookie,currentItemId){
 const prefix=`/api/sessions/${id}`;
 const paused=await ok(prefix+'/pause',{},cookie);assert.equal(paused.status,'PAUSED');
 const deadline=paused.pause.resumeUntil;
 assert.equal(new Date(deadline)-new Date(paused.pause.pausedAt),48*60*60*1000,'Exactly 48 hours');
 const retried=await ok(prefix+'/pause',{},cookie);assert.equal(retried.pause.resumeUntil,deadline,'Retry cannot extend deadline');
 assert.equal((await request(prefix+'/pause',{},staff)).response.status,403,'Staff cannot consume candidate pause');
 const before=await db.response.count({where:{sessionId:id}});
 await verifyLockedAttempt(id,cookie);
 const resumed=await ok(prefix+'/resume',{},cookie);assert.equal(resumed.status,'IN_PROGRESS');assert.equal(resumed.pause.canPause,false);
 assert.equal((await ok(prefix+'/resume',{},cookie)).status,'IN_PROGRESS','Resume retry is idempotent');
 assert.equal((await request(prefix+'/pause',{},cookie)).response.status,409,'Only one pause');
 assert.equal(await db.response.count({where:{sessionId:id}}),before,'Pause never changes answers');
 if(currentItemId)assert.equal((await ok(prefix+'/next',undefined,cookie)).item.id,currentItemId,'Resume preserves current question');
}
function valueFor(item){if(item.skill==='WRITING')return 'x';if(item.skill==='SPEAKING')return audio;
 const content=item.metadata??item.content;const options=content.options;const index=options.findIndex(option=>(typeof option==='string'?option:option.text).startsWith('Correct response'));assert(index>=0,'Controlled objective fixture required');return String.fromCharCode(65+index);}
async function startAuditServer(){
 child=spawn(process.execPath,['dist/server.js'],{env:{...process.env,NODE_ENV:'test',DISABLE_HMR:'true',PORT:'39482',DATABASE_URL:database,DIRECT_URL:database,JWT_SECRET:secret,REFRESH_SECRET:secret+'-refresh',AWS_SECRET_ARN:'',SENTRY_DSN:'',OTEL_SDK_DISABLED:'true',REDIS_URL:'',GEMINI_API_KEY:'',GOOGLE_API_KEY:'',OPENAI_API_KEY:'',ANTHROPIC_API_KEY:''},stdio:['ignore',log,log]});
 let ready=false;for(let i=0;i<100;i++){try{if((await request('/api/health')).response.ok){ready=true;break;}}catch{}if(child.exitCode!==null||child.signalCode!==null)throw Error('Local audit server exited');await new Promise(resolve=>setTimeout(resolve,200));}assert(ready,'Server readiness');
}
async function crashAuditServer(){
 const current=child;
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Audit child did not stop')),10000);
  current.once('exit',()=>{clearTimeout(timer);resolve();});
  current.kill('SIGKILL');
 });
}
const staff='accessToken='+jwt.sign({userId:admin},secret,{expiresIn:'1h'});
try{
 await db.organization.create({data:{id:org,name:'Disposable all-exam audit',slug:org}});
 await db.user.create({data:{id:admin,email:`${admin}@local-audit.test`,role:'SUPER_ADMIN',organizationId:org}});
 await db.license.create({data:{organizationId:org,type:'ENTERPRISE',credits:1000,expiresAt:new Date(Date.now()+86400000)}});
 log=openSync('/tmp/b4skills-all-exams-server.log','w');
 await startAuditServer();
 for(const product of products)await check(product+' complete/save/resume/report',async()=>{
  const user=await candidate(product),launch=await ok('/api/sessions/launch',{productLine:product},user.cookie),id=launch.sessionId;
  const observed=new Set();let complete=false,finalTheta;
  for(let i=0;i<110;i++){
   const next=await ok(`/api/sessions/${id}/next`,undefined,user.cookie);
   if(next.stop){complete=true;finalTheta=next.finalTheta;break;}if(next.sectionTransition)continue;
   assert(next.item?.id,'Next item');observed.add(next.item.skill);
   if(i===0)await verifyPause(id,user.cookie,next.item.id);
   const repeat=await ok(`/api/sessions/${id}/next`,undefined,user.cookie);assert.equal(repeat.item?.id,next.item.id,'Resume preserves served question');
   const result=await ok(`/api/sessions/${id}/respond`,{itemId:next.item.id,value:valueFor(next.item),latencyMs:30000},user.cookie);
   if(['WRITING','SPEAKING'].includes(next.item.skill))assert.notEqual(result.isCorrect,true,'Never full credit for ungraded production');
   const status=await ok(`/api/sessions/${id}/status`,undefined,user.cookie);assert(status.progress>0,'Saved response progress');
  }
  assert(complete,'Finite completion');assert.deepEqual([...observed].sort(),[...launch.sectionOrder].sort(),'Every profile section delivered');
  const stored=await db.session.findUniqueOrThrow({where:{id},include:{responses:{include:{item:true}},scoreReport:true}});
  assert(['COMPLETED','SCORING','FLAGGED'].includes(stored.status),stored.status);assert(stored.responses.length>0);if(!stored.scoreReport?.isVerified)assert.equal(finalTheta,null,'Pending scores never emit a final ability');
  const report=await ok(`/api/sessions/${id}/adaptive-report`,undefined,user.cookie);assert(report,'Report available');
  const pdf=await request(`/api/sessions/${id}/report.pdf`,undefined,user.cookie);assert.equal(pdf.response.status,200);assert(pdf.response.headers.get('content-type').includes('pdf'));
  const outsider=await db.user.create({data:{email:`${randomUUID()}@local-audit.test`,role:'CANDIDATE',organizationId:org}});
  const denied=await request(`/api/sessions/${id}/status`,undefined,'accessToken='+jwt.sign({userId:outsider.id},secret));assert.equal(denied.response.status,403);
 });
 for(const product of [...products,'Fixed Diagnostic (30 items)','Özgün Kids — Form A (96 soru)'])await check(product+' expired-resume protection',async()=>{
  const diagnostic=product==='Fixed Diagnostic (30 items)',fixed=product==='Özgün Kids — Form A (96 soru)';
  const user=await candidate(diagnostic?'15-Min Diagnostic':product);
  const launch=await ok(fixed?'/api/fixed-forms/ozgun-kids/launch':diagnostic?'/api/sessions/diagnostic/launch':'/api/sessions/launch',fixed?{organizationId:org}:diagnostic?{}:{productLine:product},user.cookie);
  const id=launch.sessionId,prefix=`/api/sessions/${id}`;
  if(fixed)await ok(prefix+'/fixed-form/start',{},user.cookie);
  else await ok(prefix+'/next',undefined,user.cookie);
  await ok(prefix+'/pause',{},user.cookie);
  const stored=await db.session.findUniqueOrThrow({where:{id}});
  const metadata=stored.metadata,deadline=new Date(Date.now()-1000);
  metadata.examPause={...metadata.examPause,pausedAt:new Date(deadline.getTime()-48*3600000).toISOString(),resumeUntil:deadline.toISOString()};
  await db.session.update({where:{id},data:{metadata}});
  await verifyLockedAttempt(id,user.cookie);
  const result=await request(prefix+'/resume',{},user.cookie);assert.equal(result.response.status,410);
  assert.equal((await db.session.findUniqueOrThrow({where:{id}})).status,'EXPIRED','Expiry persists');
  await verifyLockedAttempt(id,user.cookie);
  assert.equal((await request(prefix+'/resume',{},user.cookie)).response.status,409,'Repeated resume cannot revive expiry');
 });
 await check('Assignment and invitation product validation without sending messages',async()=>{
  const beforeCodes=await db.examCode.count({where:{organizationId:org}}),beforeAssignments=await db.assignment.count({where:{organizationId:org}});
  for(const productLine of ['Unknown exam','__proto__','']){
   assert.equal((await request('/api/codes/generate',{organizationId:org,productLine,quantity:1},staff)).response.status,400);
   // Invalid products are rejected before any mail dispatch can occur.
   assert.equal((await request('/api/codes/send-invite',{organizationId:org,productLine,email:'invalid-product@local-audit.test'},staff)).response.status,400);
   assert.equal((await request('/api/teacher/assignments',{productLine},staff)).response.status,400);
  }
  assert.equal((await request('/api/teacher/assignments',{productLine:'General English',openAt:'2026-10-14T12:00:00Z',dueAt:'2026-10-13T12:00:00Z'},staff)).response.status,400);
  assert.equal(await db.examCode.count({where:{organizationId:org}}),beforeCodes,'Invalid input creates no code');
  assert.equal(await db.assignment.count({where:{organizationId:org}}),beforeAssignments,'Invalid input creates no assignment');
  for(const productLine of products){
   const {response,data}=await request('/api/teacher/assignments',{productLine},staff);
   assert.equal(response.status,201);assert.equal(data.productLine,productLine);assert.equal(data.organizationId,org);
  }
 });
 await check('Legacy Primary and Junior codes select the assigned child profile',async()=>{
  for(const [alias,canonical] of [['Primary','Primary (7-10)'],['Junior','Junior Suite (11-14)']]){
   const user=await candidate(alias),account=await db.user.findUniqueOrThrow({where:{id:user.id}});
   await db.examCode.updateMany({where:{usedByEmail:account.email,organizationId:org},data:{productLine:alias}});
   const launch=await ok('/api/sessions/launch',{productLine:canonical},user.cookie);
   const stored=await db.session.findUniqueOrThrow({where:{id:launch.sessionId}});
   assert.equal(stored.metadata.productLine,canonical,'Legacy child code cannot silently select General English');
  }
 });
 await check('Reports exclude pretest-only and pending skill evidence',async()=>{
  const user=await candidate('15-Min Diagnostic'),{sessionId}=await ok('/api/sessions/launch',{productLine:'15-Min Diagnostic'},user.cookie);
  const next=await ok(`/api/sessions/${sessionId}/next`,undefined,user.cookie);
  await ok(`/api/sessions/${sessionId}/respond`,{itemId:next.item.id,value:valueFor(next.item),latencyMs:1000},user.cookie);
  const stored=await db.session.findUniqueOrThrow({where:{id:sessionId}}),skill=next.item.skill;
  await db.session.update({where:{id:sessionId},data:{metadata:{...stored.metadata,skillProfiles:{[skill]:{theta:2,sem:.2}}}}});
  await db.response.updateMany({where:{sessionId},data:{isPretest:true}});
  let report=await ok(`/api/sessions/${sessionId}/adaptive-report`,undefined,user.cookie);
  assert.equal(report.hasScoredEvidence,false,'Pretest response is not candidate ability evidence');
  assert.equal(report.skillScores.length,0,'Stale profiles cannot report an unmeasured skill');
  assert.equal(report.completedAt,null,'An unfinished exam has no invented completion timestamp');
  assert.equal(report.productLine,'Rapid Diagnostic (30–40 Min)','Report identifies the assigned product');
  await db.response.updateMany({where:{sessionId},data:{isPretest:false}});
  const other=await db.item.findFirstOrThrow({where:{skill,status:'ACTIVE',id:{not:next.item.id}}});
  await db.response.create({data:{sessionId,itemId:other.id,value:'Pending answer',score:null,isPretest:false,order:2,metadata:{requiresHumanReview:true}}});
  report=await ok(`/api/sessions/${sessionId}/adaptive-report`,undefined,user.cookie);
  assert.equal(report.hasScoredEvidence,true);assert.equal(report.scoringComplete,false);
  assert.equal(report.skillScores.some(score=>score.skill===skill),false,'Pending skill levels are withheld consistently with PDF');
 });
 await check('Shared and external reports revalidate final evidence and expiry',async()=>{
  const user=await candidate('General English'),completedAt=new Date(Date.now()-86400000);
  const session=await db.session.create({data:{candidateId:user.id,organizationId:org,status:'COMPLETED',theta:3,sem:1,completedAt,
   validUntil:new Date(Date.now()+86400000),metadata:{sessionType:'DIAGNOSTIC',productLine:'15-Min Diagnostic'}}});
  for(const skill of ['READING','LISTENING','WRITING','SPEAKING','GRAMMAR','VOCABULARY']){
   const items=await db.item.findMany({where:{skill,status:'ACTIVE'},take:5});assert.equal(items.length,5);
   await db.response.createMany({data:items.map((item,n)=>({sessionId:session.id,itemId:item.id,score:1,order:n+1,value:'Private response evidence',metadata:{scoreSource:'human'}}))});
  }
  await db.scoreReport.create({data:{sessionId:session.id,isVerified:true,overallCefr:'A1',overallScore:50,readingScore:50,listeningScore:0,writingScore:75,speakingScore:100,
   diagnosticReport:{scoringComplete:true,overallTheta:-2,overallSem:.2,skillProfiles:Object.fromEntries(['READING','LISTENING','WRITING','SPEAKING','GRAMMAR','VOCABULARY'].map(skill=>[skill,{theta:-2,sem:.2}]))}}});
  const shared=await ok(`/api/sessions/${session.id}/share`,{},user.cookie);
  const same=await ok(`/api/sessions/${session.id}/share`,{},user.cookie);assert.equal(same.token,shared.token,'Share requests reuse the token');
  let publicResult=await request(`/api/share/${shared.token}`);assert.equal(publicResult.response.status,200);
  assert(publicResult.response.headers.get('cache-control').includes('no-store'));
  assert.equal(publicResult.data.completedAt,completedAt.toISOString());assert.equal(publicResult.data.skills.reading,50);assert.equal(publicResult.data.skills.listening,0);
  assert.equal(publicResult.data.productLine,'Rapid Diagnostic (30–40 Min)');
  assert(!JSON.stringify(publicResult.data).includes('Private response evidence'));assert(!JSON.stringify(publicResult.data).includes('local-audit.test'));
  let external=await ok(`/api/reports/scores/${session.id}`,undefined,user.cookie);
  assert.equal(external.meta.schema_version,'2.0.0');assert.equal(external.data.overall_theta,-2);assert.equal(external.data.overall_cefr,'A1');
  assert(external.data.skills.every(skill=>skill.cefr_band==='A1'&&skill.responses===5));
  for(const status of ['SCORING','FLAGGED','EXPIRED']){
   await db.session.update({where:{id:session.id},data:{status}});
   publicResult=await request(`/api/share/${shared.token}`);assert.equal(publicResult.response.status,status==='EXPIRED'?410:409);
   assert.equal(publicResult.data.candidateName,undefined,'An invalid result exposes no candidate summary');
   external=await ok(`/api/reports/scores/${session.id}`,undefined,user.cookie);
   assert.equal(external.data.scoring_complete,false);assert.equal(external.data.overall_theta,null);assert.equal(external.data.overall_cefr,null);assert.equal(external.data.skills.length,0);
   assert.equal((await request(`/api/sessions/${session.id}/share`,{},user.cookie)).response.status,status==='EXPIRED'?410:409);
  }
  await db.session.update({where:{id:session.id},data:{status:'COMPLETED',validUntil:new Date(Date.now()-1)}});
  assert.equal((await request(`/api/share/${shared.token}`)).response.status,410,'Validity expiry is enforced');
  await db.session.update({where:{id:session.id},data:{validUntil:new Date(Date.now()+86400000),metadata:{sessionType:'DIAGNOSTIC',securityFlag:true}}});
  assert.equal((await request(`/api/share/${shared.token}`)).response.status,409,'Metadata security hold is enforced');
  await db.session.update({where:{id:session.id},data:{metadata:{sessionType:'DIAGNOSTIC'}}});
  const response=await db.response.findFirstOrThrow({where:{sessionId:session.id}});await db.response.delete({where:{id:response.id}});
  assert.equal((await request(`/api/share/${shared.token}`)).response.status,409,'Previously verified but incomplete evidence cannot be shared');
 });
 await check('Completion acknowledges terminal state without completing an unfinished exam',async()=>{
  const user=await candidate('General English'),{sessionId}=await ok('/api/sessions/launch',{productLine:'General English'},user.cookie);
  assert.equal((await request(`/api/sessions/${sessionId}/complete`,{},user.cookie)).response.status,409);
  assert.equal((await db.session.findUniqueOrThrow({where:{id:sessionId}})).status,'IN_PROGRESS');
  assert.equal(await db.scoreReport.count({where:{sessionId}}),0);
  const completedAt=new Date(Date.now()-60000);
  for(const status of ['SCORING','FLAGGED','COMPLETED']){
   await db.session.update({where:{id:sessionId},data:{status,completedAt}});
   for(let retry=0;retry<2;retry++){
    const result=await ok(`/api/sessions/${sessionId}/complete`,{},user.cookie);
    assert.equal(result.status,status);assert.equal(result.scoringComplete,false,'A lifecycle flag is not complete scored evidence');
    const stored=await db.session.findUniqueOrThrow({where:{id:sessionId}});
    assert.equal(stored.status,status,'Acknowledgement preserves scoring and holds');
    assert.equal(stored.completedAt.toISOString(),completedAt.toISOString(),'Retry preserves original completion time');
   }
  }
  assert.equal(await db.response.count({where:{sessionId}}),0);assert.equal(await db.scoreReport.count({where:{sessionId}}),0);
 });
 await check('Adaptive late-answer rejection',async()=>{
  const user=await candidate('General English'),{sessionId}=await ok('/api/sessions/launch',{productLine:'General English'},user.cookie);
  const next=await ok(`/api/sessions/${sessionId}/next`,undefined,user.cookie);
  await db.session.update({where:{id:sessionId},data:{startedAt:new Date(Date.now()-86400000)}});
  const before=await db.response.count({where:{sessionId}});
  const result=await request(`/api/sessions/${sessionId}/respond`,{itemId:next.item.id,value:valueFor(next.item)},user.cookie);
  assert(result.response.status>=400,'Late answer must be rejected');assert.equal(await db.response.count({where:{sessionId}}),before,'No late answer persisted');
 });
 await check('Assigned code cannot start a different product',async()=>{
  const user=await candidate('Primary (7-10)');const result=await request('/api/sessions/launch',{productLine:'Academia'},user.cookie);assert.equal(result.response.status,403);
 });
 await check('Diagnostic launch rejects another product code and unaffiliated users',async()=>{
  const other=await candidate('Primary (7-10)');assert.equal((await request('/api/sessions/diagnostic/launch',{},other.cookie)).response.status,403);
  const user=await db.user.create({data:{email:`${randomUUID()}@local-audit.test`,role:'CANDIDATE'}});
  const cookie='accessToken='+jwt.sign({userId:user.id},secret);assert.equal((await request('/api/sessions/diagnostic/launch',{},cookie)).response.status,403);
 });
 await check('Concurrent question delivery and duplicate answer rejection',async()=>{
  const user=await candidate('General English'),{sessionId}=await ok('/api/sessions/launch',{productLine:'General English'},user.cookie);
  const delivered=await Promise.all(Array.from({length:3},()=>ok(`/api/sessions/${sessionId}/next`,undefined,user.cookie)));
  assert.equal(new Set(delivered.map(result=>result.item.id)).size,1,'Concurrent next requests preserve one question');
  const replies=await Promise.all(Array.from({length:2},()=>request(`/api/sessions/${sessionId}/respond`,{itemId:delivered[0].item.id,value:valueFor(delivered[0].item),latencyMs:30000},user.cookie)));
  assert.deepEqual(replies.map(result=>result.response.status).sort(),[200,409]);assert.equal(await db.response.count({where:{sessionId}}),1);
 });
 await check('Non-expiring licenses and expired-license rejection',async()=>{
  for(const expired of [false,true]){const target=randomUUID();await db.organization.create({data:{id:target,name:'Disposable license audit',slug:target}});const license=await db.license.create({data:{organizationId:target,type:'ENTERPRISE',credits:2,expiresAt:expired?new Date(Date.now()-10000):null}});
   const result=await request('/api/sessions/launch',{organizationId:target,productLine:'General English'},staff);assert.equal(result.response.ok,!expired);if(expired)assert.equal(result.response.status,402);assert.equal(await db.license.count({where:{organizationId:target}}),1);assert.equal((await db.license.findUniqueOrThrow({where:{id:license.id}})).credits,expired?2:1);}
 });
 await check('Last-credit concurrent launches create exactly one session',async()=>{
  const target=randomUUID();await db.organization.create({data:{id:target,name:'Disposable last credit',slug:target}});await db.license.create({data:{organizationId:target,type:'ENTERPRISE',credits:1}});
  const replies=await Promise.all([request('/api/sessions/launch',{organizationId:target,productLine:'General English'},staff),request('/api/sessions/launch',{organizationId:target,productLine:'General English'},staff)]);
  assert.equal(replies.filter(result=>result.response.ok).length,1);assert.equal(replies.find(result=>!result.response.ok).response.status,402);assert.equal(await db.session.count({where:{organizationId:target}}),1);assert.equal(await db.paymentTransaction.count({where:{organizationId:target,creditsAdded:-1}}),1);
 });
 await check('30-item diagnostic complete and pending evidence report',async()=>{
  const user=await candidate('15-Min Diagnostic');let next=await ok('/api/sessions/diagnostic/launch',{},user.cookie);const id=next.sessionId;let item=next.firstItem;const resumed=await ok(`/api/sessions/${id}/next`,undefined,user.cookie);assert.equal(resumed.item.id,item.itemId,'Diagnostic resume keeps its own blueprint');await verifyPause(id,user.cookie,item.itemId);
  for(let i=0;i<30;i++){assert(item);if(i===0){await ok(`/api/sessions/${id}/respond`,{itemId:item.itemId,value:valueFor(item),latencyMs:30000},user.cookie);const resumed=await ok(`/api/sessions/${id}/next`,undefined,user.cookie);item={...resumed.item,itemId:resumed.item.id};continue;}next=await ok(`/api/sessions/diagnostic/${id}/respond`,{itemId:item.itemId,value:valueFor(item),latencyMs:30000},user.cookie);item=next.nextItem;}
  assert.equal(next.complete,true);assert.equal(await db.response.count({where:{sessionId:id}}),30);
  const stored=await db.session.findUniqueOrThrow({where:{id},include:{scoreReport:true}});assert(['SCORING','COMPLETED'].includes(stored.status));
  assert.equal(stored.scoreReport.isVerified,false,'Unscored speaking cannot certify');
  assert.equal((await request(`/api/sessions/diagnostic/${id}/report`,undefined,user.cookie)).response.status,409);
 });
 await check('Özgün Kids code/resume/96 questions/course guidance/media security',async()=>{
  const config=await ok('/api/fixed-forms/ozgun-kids/config',undefined,staff);assert.equal(config.answerKey.length,96);assert(config.confirmed);
  const user=await candidate('Özgün Kids — Form A (96 soru)');
  const {sessionId}=await ok('/api/fixed-forms/ozgun-kids/launch',{organizationId:org},user.cookie);
  assert.equal((await ok('/api/fixed-forms/ozgun-kids/launch',{organizationId:org},user.cookie)).sessionId,sessionId);
  const endpoint=`/api/sessions/${sessionId}/fixed-form`;
  assert.equal((await ok(endpoint,undefined,user.cookie)).questions.length,0);
  assert.equal((await ok(endpoint+'/start',{},user.cookie)).questions.length,24);
  await verifyPause(sessionId,user.cookie);
  await ok(endpoint+'/answer',{number:1,answer:config.answerKey[0]},user.cookie);
  assert.equal((await ok(`/api/sessions/${sessionId}/status`,undefined,user.cookie)).answers['1'],config.answerKey[0]);
  for(let sectionIndex=0;sectionIndex<4;sectionIndex++)await ok(endpoint+'/advance',{sectionIndex},user.cookie);
  const report=await ok(`/api/sessions/${sessionId}/adaptive-report`,undefined,user.cookie);
  assert.equal(report.sessionType,'FIXED_FORM');assert.equal(report.fixedFormReport.correct,1);assert.equal(report.fixedFormReport.blank,95);
  assert.equal(report.fixedFormReport.placement.automaticPlacement,false);assert.equal(report.fixedFormReport.placement.clusters.length,6);
  assert.equal(await db.scoreReport.findUnique({where:{sessionId}}),null,'A fixed four-skill form cannot issue a general CEFR certificate');
  assert.equal((await request('/api/fixed-forms/ozgun-kids/config',undefined,user.cookie)).response.status,403);
  const booklet='/assessments/ozgun-kids/form-a-v1/booklet.pdf';
  assert.equal((await request(booklet,undefined,staff,'HEAD')).response.status,200);
  assert.equal((await request(booklet,undefined,user.cookie,'HEAD')).response.status,403);
  const media=await fetch(base+'/assessments/ozgun-kids/form-a-v1/Listening_Tam_Sinav.mp3',{headers:{'user-agent':'B4SkillsLocalAudit',range:'bytes=0-31'}});
  assert.equal(media.status,206);assert.equal((await media.arrayBuffer()).byteLength,32);
 });
 await check('Durable report refresh repairs saved grades and preserves security holds',async()=>{
  const sessions=await db.session.findMany({where:{organizationId:org,status:'COMPLETED',scoreReport:{isNot:null}},
   include:{responses:true,scoreReport:true},orderBy:{createdAt:'asc'},take:3});
  assert.equal(sessions.length,3);
  const statuses=['COMPLETED','SCORING','FLAGGED'];
  for(let index=0;index<sessions.length;index++){
   const session=sessions[index],diagnostic=session.scoreReport.diagnosticReport;
   await db.$transaction(async tx=>{
    for(const response of session.responses.filter(row=>!row.isPretest))await tx.response.update({where:{id:response.id},
     data:{score:1,humanScore:1,isCorrect:true,metadata:{...response.metadata,scoreSource:'human',
      pendingAsyncScore:false,asyncScored:true,requiresHumanReview:false,scoreFailed:false,
      reportRefreshPending:true,reportRefreshVersion:randomUUID()}}});
    await tx.session.update({where:{id:session.id},data:{status:statuses[index],
     metadata:{...session.metadata,pendingAsyncScoring:true,pendingCount:999}}});
    await tx.scoreReport.update({where:{sessionId:session.id},data:{isVerified:false,
     diagnosticReport:{...diagnostic,scoringComplete:false}}});
   });
  }
  const ids=sessions.map(session=>session.id),deadline=Date.now()+90_000;
  let pending=1;
  while(pending && Date.now()<deadline){
   await new Promise(resolve=>setTimeout(resolve,500));
   pending=await db.response.count({where:{sessionId:{in:ids},metadata:{path:['reportRefreshPending'],equals:true}}});
  }
  assert.equal(pending,0,'Persisted report retries clear after successful rebuilding');
  for(let index=0;index<sessions.length;index++){
   const before=sessions[index],after=await db.session.findUniqueOrThrow({where:{id:before.id},include:{responses:true,scoreReport:true}});
   assert.equal(after.status,index===2?'FLAGGED':'COMPLETED','Report refresh cannot clear a security hold');
   assert.equal(+after.completedAt,+before.completedAt,'Completion date remains authoritative');
   assert.equal(after.metadata.pendingCount,0,'Report no longer contains stale pending counts');
   assert.equal(after.metadata.pendingAsyncScoring,false);
   assert.equal(after.responses.length,before.responses.length);
   for(const response of after.responses){
    assert.equal(response.value,before.responses.find(row=>row.id===response.id).value,'Report recovery preserves answers');
    if(!response.isPretest)assert.equal(response.humanScore,1,'Report recovery preserves committed human grades');
   }
   if(index===2){assert.equal(after.scoreReport.isVerified,false);assert.equal(after.scoreReport.diagnosticReport.securityFlag,true);}
  }
 });
 await check('Periodic recovery processes more than 100 persisted scoring submissions without reconnect',async()=>{
  const user=await candidate('General English');
  const item=await db.item.findFirstOrThrow({where:{skill:'WRITING',type:'WRITING_PROMPT'}});
  const ids=Array.from({length:105},()=>randomUUID());
  await db.session.createMany({data:ids.map(id=>({id,organizationId:org,candidateId:user.id,status:'IN_PROGRESS',
   metadata:{productLine:'General English'}}))});
  const value='During my last holiday I visited a small town with my family. We travelled by train and stayed with friends. Every morning we walked through the town and talked about our plans. I enjoyed the trip because we had time to spend together and learn about a new place. Next year I would like to return and explore the surrounding countryside.';
  await db.response.createMany({data:ids.map(sessionId=>({sessionId,itemId:item.id,value,order:1,
   metadata:{pendingAsyncScore:true,scoringMode:'WRITING'}}))});
  // These records are inserted after startup while the database stays healthy.
  // AI providers are disabled in this local server: recovery must preserve each
  // answer and route unavailable scoring to review, never invent a final grade.
  const deadline=Date.now()+90_000;
  let pending=105;
  while(pending && Date.now()<deadline){
   await new Promise(resolve=>setTimeout(resolve,500));
   pending=await db.response.count({where:{sessionId:{in:ids},metadata:{path:['pendingAsyncScore'],equals:true}}});
  }
  assert.equal(pending,0,'Every persisted submission is recovered across bounded batches');
  const responses=await db.response.findMany({where:{sessionId:{in:ids}}});
  assert.equal(responses.length,105,'Recovery neither loses nor duplicates answers');
  for(const response of responses){
   assert.equal(response.value,value,'Saved writing remains intact');
   assert.equal(response.metadata.asyncScored,true);
   assert.equal(response.score,null,'Unavailable AI cannot produce a proficiency score');
   assert.equal(response.metadata.requiresHumanReview,true);
  }
  assert.equal(await db.ratingTask.count({where:{response:{sessionId:{in:ids}}}}),105,'Failed AI scoring is visible for human review');
 });
 await check('Abrupt restart preserves all 11 persistent assessment flows and one-time pause rights',async()=>{
  const cases=[];
  for(const [index,product] of [...products,'Fixed Diagnostic (30 items)','Özgün Kids — Form A (96 soru)'].entries()){
   const fixed=product==='Özgün Kids — Form A (96 soru)',diagnostic=product==='Fixed Diagnostic (30 items)';
   const user=await candidate(diagnostic?'15-Min Diagnostic':product);
   const endpoint=fixed?'/api/fixed-forms/ozgun-kids/launch':diagnostic?'/api/sessions/diagnostic/launch':'/api/sessions/launch';
   const body=fixed?{organizationId:org}:diagnostic?{}:{productLine:product};
   const launch=await ok(endpoint,body,user.cookie),id=launch.sessionId,prefix=`/api/sessions/${id}`;
   let nextItemId;
   if(fixed){
    await ok(prefix+'/fixed-form/start',{},user.cookie);
    const config=await ok('/api/fixed-forms/ozgun-kids/config',undefined,staff);
    await ok(prefix+'/fixed-form/answer',{number:1,answer:config.answerKey[0]},user.cookie);
   }else{
    const next=await ok(prefix+'/next',undefined,user.cookie);
    await ok(prefix+'/respond',{itemId:next.item.id,value:valueFor(next.item),latencyMs:30000},user.cookie);
    nextItemId=(await ok(prefix+'/next',undefined,user.cookie)).item.id;
   }
   if(index%2===0)await ok(prefix+'/pause',{},user.cookie);
   const stored=await db.session.findUniqueOrThrow({where:{id},include:{responses:{orderBy:{id:'asc'}}}});
   const status=await ok(prefix+'/status',undefined,user.cookie);
   assert(fixed?status.answers['1']:status.answeredItemIds.length===1,'Server confirms the saved answer before crashing');
   cases.push({user,id,prefix,fixed,diagnostic,product,nextItemId,stored});
  }
  const preview=await ok('/api/assessment/placement/start',{});
  const credits=(await db.license.findFirstOrThrow({where:{organizationId:org}})).credits;
  const sessionCount=await db.session.count({where:{organizationId:org}});
  await crashAuditServer();
  await startAuditServer();
  for(const row of cases){
   const after=await db.session.findUniqueOrThrow({where:{id:row.id},include:{responses:{orderBy:{id:'asc'}}}});
   assert.equal(after.status,row.stored.status,'Restart preserves active/paused lifecycle');
   assert.deepEqual(after.responses,row.stored.responses,'Every acknowledged answer survives abrupt shutdown');
   assert.deepEqual(after.metadata,row.stored.metadata,'Progress, clocks, current item and pause deadline survive restart');
   assert.equal(+after.startedAt,+row.stored.startedAt,'Restart does not reset the attempt start');
   if(row.stored.status==='PAUSED'){
    await verifyLockedAttempt(row.id,row.user.cookie);
    const resumed=await ok(row.prefix+'/resume',{},row.user.cookie);
    assert.equal(resumed.pause.canPause,false,'A crash cannot grant an extra pause');
    assert.equal((await request(row.prefix+'/pause',{},row.user.cookie)).response.status,409);
   }
   if(row.fixed){const view=await ok(row.prefix+'/fixed-form',undefined,row.user.cookie);
    assert.equal(view.answers['1'],row.stored.metadata.fixedForm.answers['1']);
   }else{
    const view=await ok(row.prefix+'/next',undefined,row.user.cookie);
    assert.equal(view.item.id,row.nextItemId,'Resume delivers the same unanswered question');
    const original=row.stored.responses[0];
    const duplicate={itemId:original.itemId,value:original.value,latencyMs:30000};
    assert.equal((await request(row.prefix+'/respond',duplicate,row.user.cookie)).response.status,409,`${row.product}: duplicate answer is an operational conflict`);
    if(row.diagnostic)assert.equal((await request(`/api/sessions/diagnostic/${row.id}/respond`,duplicate,row.user.cookie)).response.status,409,'Diagnostic-specific route preserves the same conflict');
    const preserved=await db.response.findMany({where:{sessionId:row.id},orderBy:{id:'asc'}});
    assert.deepEqual(preserved,row.stored.responses,'Rejected duplicate cannot alter any acknowledged answer');
   }
  }
  assert.equal((await db.license.findFirstOrThrow({where:{organizationId:org}})).credits,credits,'Restart/resume cannot consume another credit');
  assert.equal(await db.session.count({where:{organizationId:org}}),sessionCount,'Restart/resume cannot create another attempt');
  const lost=await request(`/api/assessment/placement/${preview.placementId}/respond`,{itemId:preview.firstItem.id,selectedOption:valueFor(preview.firstItem),latencyMs:30000});
  assert.equal(lost.response.status,410,'Anonymous quick check reports lost in-memory session explicitly');
  assert.equal(lost.data.code,'PLACEMENT_SESSION_EXPIRED');
  assert(!lost.data.result,'A lost quick check cannot invent a result');
  for(const invalidId of ['__proto__','constructor','toString']){
   const missing=await request(`/api/assessment/placement/${invalidId}/respond`,{itemId:'missing',selectedOption:'A'});
   assert.equal(missing.response.status,410,'Object property names are not valid quick-check sessions');
   assert.equal(missing.data.code,'PLACEMENT_SESSION_EXPIRED');
  }
 });
 await check('Freemium six-skill completion with ungraded speech',async()=>{
  const start=await ok('/api/assessment/placement/start',{});let item=start.firstItem,result;
  for(let i=0;i<50;i++){result=await ok(`/api/assessment/placement/${start.placementId}/respond`,{itemId:item.id,selectedOption:valueFor(item),latencyMs:30000});if(result.complete)break;item=result.nextItem;assert(item);}
  assert(result.complete);assert.deepEqual(Object.keys(result.result.skillBreakdown).sort(),['GRAMMAR','VOCABULARY','READING','LISTENING','WRITING','SPEAKING'].sort());
 });
}finally{
 child?.kill('SIGTERM');if(child&&child.exitCode===null)await new Promise(resolve=>{const timer=setTimeout(()=>{child.kill('SIGKILL');resolve();},3000);child.once('exit',()=>{clearTimeout(timer);resolve();});});if(log!==undefined)closeSync(log);await db.$disconnect();
 writeFileSync('/tmp/b4skills-all-exams-flow-results.json',JSON.stringify(results,null,2)+'\n');
}
if(results.some(result=>!result.passed))process.exitCode=1;
