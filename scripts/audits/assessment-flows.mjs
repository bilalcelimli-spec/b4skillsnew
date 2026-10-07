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
function valueFor(item){if(item.skill==='WRITING')return 'x';if(item.skill==='SPEAKING')return audio;
 const content=item.metadata??item.content;const options=content.options;const index=options.findIndex(option=>(typeof option==='string'?option:option.text).startsWith('Correct response'));assert(index>=0,'Controlled objective fixture required');return String.fromCharCode(65+index);}
const staff='accessToken='+jwt.sign({userId:admin},secret,{expiresIn:'1h'});
try{
 await db.organization.create({data:{id:org,name:'Disposable all-exam audit',slug:org}});
 await db.user.create({data:{id:admin,email:`${admin}@local-audit.test`,role:'SUPER_ADMIN',organizationId:org}});
 await db.license.create({data:{organizationId:org,type:'ENTERPRISE',credits:1000,expiresAt:new Date(Date.now()+86400000)}});
 log=openSync('/tmp/b4skills-all-exams-server.log','w');
 child=spawn(process.execPath,['dist/server.js'],{env:{...process.env,NODE_ENV:'test',DISABLE_HMR:'true',PORT:'39482',DATABASE_URL:database,DIRECT_URL:database,JWT_SECRET:secret,REFRESH_SECRET:secret+'-refresh',AWS_SECRET_ARN:'',SENTRY_DSN:'',OTEL_SDK_DISABLED:'true',REDIS_URL:'',GEMINI_API_KEY:'',GOOGLE_API_KEY:'',OPENAI_API_KEY:'',ANTHROPIC_API_KEY:''},stdio:['ignore',log,log]});
 let ready=false;for(let i=0;i<100;i++){try{if((await request('/api/health')).response.ok){ready=true;break;}}catch{}if(child.exitCode!==null)throw Error('Local audit server exited');await new Promise(resolve=>setTimeout(resolve,200));}assert(ready,'Server readiness');
 for(const product of products)await check(product+' complete/save/resume/report',async()=>{
  const user=await candidate(product),launch=await ok('/api/sessions/launch',{productLine:product},user.cookie),id=launch.sessionId;
  const observed=new Set();let complete=false,finalTheta;
  for(let i=0;i<110;i++){
   const next=await ok(`/api/sessions/${id}/next`,undefined,user.cookie);
   if(next.stop){complete=true;finalTheta=next.finalTheta;break;}if(next.sectionTransition)continue;
   assert(next.item?.id,'Next item');observed.add(next.item.skill);
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
  const user=await candidate('15-Min Diagnostic');let next=await ok('/api/sessions/diagnostic/launch',{},user.cookie);const id=next.sessionId;let item=next.firstItem;const resumed=await ok(`/api/sessions/${id}/next`,undefined,user.cookie);assert.equal(resumed.item.id,item.itemId,'Diagnostic resume keeps its own blueprint');
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
