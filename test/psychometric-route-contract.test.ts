import express from 'express';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import { createPsychometricsRouter } from '../src/routes/psychometrics.js';
const findMany=vi.fn(async()=>[{theta:0,sem:0.3},{theta:1,sem:0.2}]);
let server:Server;let origin:string;
beforeAll(async()=>{
  const app=express();
  app.use('/api/psychometrics',createPsychometricsRouter({session:{findMany}} as any,()=> (req,res,next)=>{
    if(req.headers.authorization!=='Bearer admin'){res.status(403).json({error:'Forbidden'});return;}
    next();
  }));
  server=await new Promise(resolve=>{const instance=app.listen(0,'127.0.0.1',()=>resolve(instance));});
  origin=`http://127.0.0.1:${(server.address() as any).port}`;
});
afterAll(async()=>{await new Promise<void>((resolve,reject)=>server.close(err=>err?reject(err):resolve()));});
it('protects the curve route before querying the database',async()=>{
  findMany.mockClear();const res=await fetch(origin+'/api/psychometrics/csem-curve');
  expect(res.status).toBe(403);expect(findMany).not.toHaveBeenCalled();
});
it.each(['csem-curve','conditional-sem'])('returns the actual chart contract at %s',async path=>{
  const res=await fetch(origin+'/api/psychometrics/'+path,{headers:{authorization:'Bearer admin'}});
  expect(res.status).toBe(200);expect(await res.json()).toMatchObject({sampleSize:2,thetaRange:[-4,4],
    cefrCuts:{A1:-3,A2:-1.75},points:[{theta:0,meanSem:0.3,n:1},{theta:1,meanSem:0.2,n:1}]});
});
it('protects score evidence before querying any session data',async()=>{
  findMany.mockClear();const res=await fetch(origin+'/api/psychometrics/score-validity');
  expect(res.status).toBe(403);expect(findMany).not.toHaveBeenCalled();
});
it('returns nullable measurements when no eligible score evidence exists',async()=>{
  findMany.mockResolvedValueOnce([]);
  const res=await fetch(origin+'/api/psychometrics/score-validity',{headers:{authorization:'Bearer admin'}});
  expect(res.status).toBe(200);expect(await res.json()).toMatchObject({nSessions:0,overallAlpha:null,
    overallOmega:null,marginalReliability:null,meanSEM:null,repeatAgreement:{nPairs:0,exact:null,kappa:null}});
  expect(findMany).toHaveBeenLastCalledWith(expect.objectContaining({where:expect.objectContaining({status:'COMPLETED'}),take:3000}));
});
