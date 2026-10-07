import express from 'express';
import {afterAll,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import type {Server} from 'node:http';
const service=vi.hoisted(()=>({config:vi.fn(),saveConfig:vi.fn(),launch:vi.fn(),read:vi.fn(),start:vi.fn(),answer:vi.fn(),advance:vi.fn(),listen:vi.fn()}));
vi.mock('../src/lib/fixed-forms/ozgun-kids-service',()=>({createOzgunKidsService:()=>service,FixedFormError:class extends Error{constructor(message:string,public status=400){super(message);}}}));
import {createOzgunKidsRouter} from '../src/routes/ozgun-kids';
let server:Server,base:string,ownership=true,available=true;
beforeAll(async()=>{
 const app=express();app.use(express.json());
 app.use('/api',createOzgunKidsRouter({prisma:{} as any,databaseAvailable:()=>available,
 auth:(req:any,res:any,next:any)=>{if(!req.headers.authorization)return res.status(401).end();req.user={id:'candidate',email:'candidate@test.example',role:req.headers['x-role']??'CANDIDATE',organizationId:'org'};next();},
 checkRole:roles=>(req:any,res:any,next:any)=>roles.includes(req.user?.role)?next():res.status(403).end(),
 assertOwnership:async(_req,res)=>{if(!ownership)res.status(403).end();return ownership;}}));
 app.get('/api/unrelated',(_req,res)=>res.json({public:true}));
 server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});base=`http://127.0.0.1:${(server.address() as any).port}/api`;
});
afterAll(()=>new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve())));
beforeEach(()=>{vi.clearAllMocks();ownership=true;available=true;service.config.mockResolvedValue({answerKey:'A'.repeat(96),confirmed:false});service.launch.mockResolvedValue({sessionId:'real'});service.read.mockResolvedValue({answers:{}});});
const auth={authorization:'Bearer fixture'};
describe('fixed form HTTP access and integration',()=>{
 it('does not capture unrelated routes and denies unauthenticated sessions',async()=>{expect((await fetch(base+'/unrelated')).status).toBe(200);expect((await fetch(base+'/sessions/exam/fixed-form')).status).toBe(401);expect(service.read).not.toHaveBeenCalled();});
 it('keeps answer keys staff-only and institution-scoped',async()=>{
  expect((await fetch(base+'/fixed-forms/ozgun-kids/config',{headers:auth})).status).toBe(403);
  const response=await fetch(base+'/fixed-forms/ozgun-kids/config?organizationId=other',{headers:{...auth,'x-role':'INST_ADMIN'}});expect(response.status).toBe(200);expect(service.config).toHaveBeenCalledWith('org');
  expect((await fetch(base+'/fixed-forms/ozgun-kids/config',{method:'PUT',headers:{...auth,'x-role':'INST_ADMIN','Content-Type':'application/json'},body:JSON.stringify({organizationId:'other',answerKey:'A'.repeat(96),confirmed:true})})).status).toBe(403);
  expect(service.saveConfig).not.toHaveBeenCalled();
 });
 it('derives candidate identity from authentication and rejects cross-tenant launch',async()=>{
  expect((await fetch(base+'/fixed-forms/ozgun-kids/launch',{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({organizationId:'org',candidateId:'injected'})})).status).toBe(200);
  expect(service.launch).toHaveBeenCalledWith('candidate','org','CANDIDATE','candidate@test.example');
  expect((await fetch(base+'/fixed-forms/ozgun-kids/launch',{method:'POST',headers:{...auth,'Content-Type':'application/json'},body:JSON.stringify({organizationId:'other'})})).status).toBe(403);
 });
 it('checks ownership on every answer and navigation action and fails closed without database',async()=>{
  ownership=false;
  for(const action of ['start','answer','advance','listen'])expect((await fetch(base+`/sessions/other/fixed-form/${action}`,{method:'POST',headers:auth})).status).toBe(403);
  for(const name of ['start','answer','advance','listen'] as const)expect(service[name]).not.toHaveBeenCalled();
  available=false;expect((await fetch(base+'/sessions/exam/fixed-form',{headers:auth})).status).toBe(503);expect(service.read).not.toHaveBeenCalled();
 });
});
