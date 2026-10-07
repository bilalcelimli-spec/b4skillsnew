import express from 'express';
import type { Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdminScoringRouter } from '../src/routes/admin-scoring';
import { retryScoringJob, summarizeAdminQueue } from '../src/lib/scoring/admin-queue';
const response = (id:string, patch:any={}) => ({id,sessionId:'session',itemId:id,value:'My essay',score:null,humanScore:null,
  isPretest:false,metadata:{pendingAsyncScore:true},createdAt:new Date('2026-10-01T00:00:00Z'),
  item:{skill:'WRITING',type:'SHORT_ANSWER',content:{prompt:'Write about this text',passage:'Server held source'}},
  ratingTask:null,session:{candidate:{name:'Candidate',email:'candidate@example.test'}},...patch});
const findMany=vi.fn(),enqueueScoringJob=vi.fn(),isScoringJobPending=vi.fn();
let available=true;let ownership=true;let server:Server;let origin:string;
beforeAll(async()=>{
  const app=express();app.use('/api/admin/scoring-queue',createAdminScoringRouter({
    prisma:{response:{findMany}} as any,databaseAvailable:()=>available,
    checkRole:()=> (req:any,res,next)=>{if(!req.headers.authorization){res.status(403).end();return;}
      req.user={role:req.headers['x-role']??'SUPER_ADMIN',organizationId:req.headers['x-org']};next();},
    assertSessionOwnership:async(_req,res)=>{if(!ownership)res.status(403).end();return ownership;},
    loadQueue:async()=>({enqueueScoringJob,isScoringJobPending}),
  }));
  server=await new Promise(resolve=>{const instance=app.listen(0,'127.0.0.1',()=>resolve(instance));});
  origin=`http://127.0.0.1:${(server.address() as any).port}/api/admin/scoring-queue`;
});
afterAll(async()=>{await new Promise<void>((resolve,reject)=>server.close(err=>err?reject(err):resolve()));});
beforeEach(()=>{vi.clearAllMocks();available=true;ownership=true;findMany.mockResolvedValue([]);enqueueScoringJob.mockResolvedValue({});isScoringJobPending.mockReturnValue(false);});
const headers={authorization:'Bearer admin'};
describe('scoring queue evidence',()=>{
 it('counts actual responses, including numeric placeholders and integrated productive tasks',()=>{
   const data=summarizeAdminQueue([response('1'),response('2',{score:.5}),response('3',{item:{skill:'LISTENING',type:'INTEGRATED_TASK',content:{responseFormat:'written'}}}),
     response('4',{score:0,metadata:{}}),response('5',{isPretest:true}),response('6',{metadata:{requiresHumanReview:true}})],Date.parse('2026-10-03T00:00:00Z'));
   expect(data.items).toHaveLength(1);expect(data.items[0]).toMatchObject({pendingCount:4,reviewCount:1,retryableCount:3,overdue:true});
   expect(data.stats).toEqual({totalPending:4,overdueCount:4,soonCount:0});
 });
 it('uses the source-aware prompt and does not retry a human dispute or active review',()=>{
   expect(retryScoringJob(response('1'))?.prompt).toContain('Server held source');
   expect(retryScoringJob(response('2',{metadata:{requiresHumanReview:true}}))).toBeNull();
   expect(retryScoringJob(response('3',{ratingTask:{status:'CLAIMED',score:null}}))).toBeNull();
   expect(retryScoringJob(response('4',{ratingTask:{status:'PENDING',score:.7}}))).toBeNull();
   expect(retryScoringJob(response('5',{humanScore:.9}))).toBeNull();
 });
 it('supports integrated audio and rejects a speaking text marker',()=>{
   const item={skill:'LISTENING',type:'INTEGRATED_TASK',content:{responseFormat:'spoken-or-written',transcript:'Source'}};
   expect(retryScoringJob(response('1',{item,value:JSON.stringify({audio:'abc',mimeType:'audio/webm'})}))?.skill).toBe('SPEAKING');
   expect(retryScoringJob(response('2',{item:{skill:'SPEAKING',type:'SHORT_ANSWER',content:{}},value:'[recorded]'}))).toBeNull();
 });
 it('requires authentication before reading submissions',async()=>{
   expect((await fetch(origin)).status).toBe(403);expect(findMany).not.toHaveBeenCalled();
 });
 it('reports database failure instead of a successful empty queue',async()=>{
   available=false;expect((await fetch(origin,{headers})).status).toBe(503);expect(findMany).not.toHaveBeenCalled();
 });
 it('requires an organization for institutional admins and scopes their list',async()=>{
   expect((await fetch(origin,{headers:{...headers,'x-role':'INST_ADMIN'}})).status).toBe(403);
   expect(findMany).not.toHaveBeenCalled();
   expect((await fetch(origin,{headers:{...headers,'x-role':'INST_ADMIN','x-org':'org'}})).status).toBe(200);
   expect(findMany.mock.calls[0][0].where.session.organizationId).toBe('org');
   expect(findMany.mock.calls[0][0].where.session.status.in).toEqual(expect.arrayContaining(['SCORING','FLAGGED','PAUSED']));
 });
 it('checks ownership before requeue and enqueues only eligible submissions',async()=>{
   ownership=false;expect((await fetch(origin+'/session/requeue',{method:'POST',headers})).status).toBe(403);
   expect(findMany).not.toHaveBeenCalled();ownership=true;
   findMany.mockResolvedValue([response('1'),response('2',{metadata:{requiresHumanReview:true}}),response('3')]);
   isScoringJobPending.mockImplementation(id=>id==='3');
   const res=await fetch(origin+'/session/requeue',{method:'POST',headers});
   expect(await res.json()).toEqual({ok:true,queued:1,skipped:2});expect(enqueueScoringJob).toHaveBeenCalledTimes(1);
 });
});
