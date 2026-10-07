import express from 'express';
import type { Server } from 'node:http';
import { afterAll,beforeAll,beforeEach,expect,it,vi } from 'vitest';
import { createRatingRouter } from '../src/routes/rating';
const service={getTasks:vi.fn(),claimTask:vi.fn(),claimSecondRating:vi.fn(),claimArbitration:vi.fn(),
  submitRating:vi.fn(),submitSecondRating:vi.fn(),submitArbitration:vi.fn()};
let server:Server;let origin:string;let available=true;
beforeAll(async()=>{
 const app=express();app.use(express.json());app.use('/api/rating',createRatingRouter({
  service:service as any,prisma:{ratingTask:{count:async()=>0,findMany:async()=>[]}} as any,databaseAvailable:()=>available,
  checkRole:()=> (req:any,res,next)=>{
   if(req.headers.authorization!=='Bearer rater'){res.status(403).end();return;}
   req.user={id:'trusted-rater',role:'RATER'};next();
  },
 }));
 server=await new Promise(resolve=>{const instance=app.listen(0,'127.0.0.1',()=>resolve(instance));});
 origin=`http://127.0.0.1:${(server.address() as any).port}/api/rating`;
});
afterAll(async()=>{await new Promise<void>((resolve,reject)=>server.close(err=>err?reject(err):resolve()));});
beforeEach(()=>{available=true;Object.values(service).forEach(mock=>{mock.mockReset();mock.mockResolvedValue({id:'task'});});});
const headers={authorization:'Bearer rater','content-type':'application/json'};
it('requires role authentication before arbitration access',async()=>{
 expect((await fetch(origin+'/tasks/task/claim-arbitration',{method:'POST'})).status).toBe(403);
 expect(service.claimArbitration).not.toHaveBeenCalled();
});
it('uses the authenticated identity for arbitration claim and resume listing',async()=>{
 expect((await fetch(origin+'/tasks/task/claim-arbitration',{method:'POST',headers,body:JSON.stringify({raterId:'forged'})})).status).toBe(200);
 expect(service.claimArbitration).toHaveBeenCalledWith('task','trusted-rater');
 await fetch(origin+'/tasks?status=CLAIMED',{headers});expect(service.getTasks).toHaveBeenCalledWith('CLAIMED','trusted-rater');
});
it('validates normalized arbitration scores before calling the service',async()=>{
 const response=await fetch(origin+'/tasks/task/submit-arbitration',{method:'POST',headers,body:JSON.stringify({score:80,feedback:'Invalid scale'})});
 expect(response.status).toBe(400);expect(service.submitArbitration).not.toHaveBeenCalled();
});
it('submits the independent third grade and maps conflicts to 409',async()=>{
 const body=JSON.stringify({score:.8,feedback:'Independent decision'});
 const response=await fetch(origin+'/tasks/task/submit-arbitration',{method:'POST',headers,body});
 expect(response.status).toBe(200);expect(service.submitArbitration).toHaveBeenCalledWith('task',.8,'Independent decision','trusted-rater');
 service.submitArbitration.mockRejectedValue(new Error('already graded'));
 expect((await fetch(origin+'/tasks/task/submit-arbitration',{method:'POST',headers,body})).status).toBe(409);
});
it('rejects unavailable storage and malformed status filters explicitly',async()=>{
 available=false;expect((await fetch(origin+'/tasks',{headers})).status).toBe(503);expect(service.getTasks).not.toHaveBeenCalled();
 available=true;expect((await fetch(origin+'/tasks?status=invalid',{headers})).status).toBe(400);
});
