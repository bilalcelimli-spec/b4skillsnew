import path from 'node:path';
// Opt-in real-database integration. Never seeds items or accesses customer accounts.
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { Backend, blankTask, canRender, responseMode, type Answer } from '../../src/api';

(globalThis as any).__DEV__ = true;
const root = path.resolve(process.cwd(), 'build/realdb-validation');
const base = 'http://127.0.0.1:3004';
if (process.env.B4SKILLS_API_VALIDATION_MODE !== 'true') throw new Error('Use the private validation runtime configuration.');
const db = new PrismaClient();
const account = JSON.parse(fs.readFileSync(`${root}/candidates.json`, 'utf8')).find((a: any) => a.platform === 'client');
const jar = new Map<string, string>();
const fetchNetwork = globalThis.fetch;
globalThis.fetch = (async (url: any, init: any = {}) => {
  const headers = new Headers(init.headers);
  if (jar.size) headers.set('Cookie', [...jar].map(([k,v]) => `${k}=${v}`).join('; '));
  const response = await fetchNetwork(url, { ...init, headers });
  for (const line of response.headers.getSetCookie()) {
    const pair = line.split(';')[0]; const i = pair.indexOf('=');
    if (!pair.slice(i+1)) jar.delete(pair.slice(0,i)); else jar.set(pair.slice(0,i),pair.slice(i+1));
  }
  return response;
}) as typeof fetch;

async function main() {
  const org = await db.organization.findUniqueOrThrow({where:{id:account.organizationId}});
  assert.equal(org.slug, 'apple-native-realdb-validation');
  const user = await db.user.findUniqueOrThrow({where:{id:account.userId}});
  assert.equal(user.organizationId, org.id); assert.equal(user.email, account.email); assert.equal(user.role,'CANDIDATE');
  const health = await fetchNetwork(`${base}/api/health`).then(r=>r.json()); assert.equal(health.database,'up');
  const api = new Backend(base); const signedIn = await api.login(account.email,account.password);
  assert.equal(signedIn.uid,account.userId);
  const before = await db.license.aggregate({where:{organizationId:org.id},_sum:{credits:true}});
  const intent = crypto.randomUUID();
  const launch = await api.launch('General English',org.id,intent);
  const replay = await api.launch('General English',org.id,intent); assert.equal(launch.sessionId,replay.sessionId);
  const debit = await db.license.aggregate({where:{organizationId:org.id},_sum:{credits:true}});
  assert.equal(before._sum.credits! - debit._sum.credits!,1);
  const sessionId = launch.sessionId;
  const counts: Record<string,number> = {}; const mediaChecks: number[] = [];
  let unsupported: unknown = null;
  for(let i=0;i<110;i++) {
    const delivery = await api.next(sessionId); if(delivery.stop) break; if(delivery.sectionTransition) continue;
    const item = delivery.item!;
    if(!canRender(item)) { unsupported = {type:item.type,skill:item.skill,itemId:item.id}; break; }
    if(item.metadata.audioUrl) {
      const response = await fetchNetwork(api.mediaUrl(item.metadata.audioUrl)!,{signal:AbortSignal.timeout(20000)});
      mediaChecks.push(response.status); await response.body?.cancel();
      if(!response.ok) throw new Error(`Media request failed HTTP ${response.status}`);
    }
    const mode = responseMode(item);
    const answer: Answer = mode === 'choice' ? {kind:'choice',index:i % (item.metadata.options?.length || 1)}
      : mode === 'blanks' ? {kind:'blanks',answers:Array(blankTask(item).count).fill('test')}
      : mode === 'text' ? {kind:'text',text:'Synthetic integration test response. I practise English every morning because it helps me communicate with people from many countries. Last week I visited a local library and read a book about travel. I believe that learning new languages creates opportunities to understand different cultures and work together on important problems.'}
      : {kind:'audio',base64:fs.readFileSync('/tmp/b4skills-apple-e2e/speech.m4a').toString('base64')};
    await api.respond(sessionId,item.id,answer,15000);
    const persisted = await db.response.count({where:{sessionId,itemId:item.id}}); assert.equal(persisted,1);
    const progress = await api.status(sessionId); assert.ok(progress.answeredItemIds?.includes(item.id));
    counts[item.skill]=(counts[item.skill]||0)+1;
    console.log(JSON.stringify({step:'response-persisted',skill:item.skill,count:Object.values(counts).reduce((a,b)=>a+b,0)}));
  }
  const progress = await api.status(sessionId);
  const stored = await db.session.findUniqueOrThrow({where:{id:sessionId}});
  assert.equal(stored.candidateId,account.userId); assert.equal(stored.organizationId,org.id); assert.equal(stored.status,progress.status);
  const anonymous = await fetchNetwork(`${base}/api/sessions/${sessionId}/status`); assert.equal(anonymous.status,401);
  const ownCookie = new Map(jar);jar.clear();
  const other = JSON.parse(fs.readFileSync(`${root}/candidates.json`,'utf8')).find((a:any)=>a.platform==='mac');
  await api.login(other.email,other.password);
  await assert.rejects(api.status(sessionId),(e:any)=>e.status===403);
  jar.clear();for(const [k,v] of ownCookie) jar.set(k,v);
  const result={testedAt:new Date().toISOString(),database:'real Supabase PostgreSQL',base,sessionId,organizationId:org.id,status:progress.status,progress:progress.progress,counts,mediaChecks,unsupported,oneCreditDebit:true,idempotentReplay:true,dbPersistence:true,anonymousBlocked:true,otherCandidateBlocked:true,pendingCount:progress.pendingCount,provisional:progress.provisional};
  fs.mkdirSync(root,{recursive:true,mode:0o700});
  fs.writeFileSync(`${root}/result.json`,JSON.stringify(result,null,2),{mode:0o600}); console.log(JSON.stringify(result,null,2));
  if(unsupported || progress.status!=='COMPLETED') process.exitCode=2;
}
main().catch(e=>{console.error(JSON.stringify({failure:e.message,code:e.code??e.status??null}));process.exitCode=1;}).finally(()=>db.$disconnect());
