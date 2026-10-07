import express from 'express';
import type { PrismaClient } from '@prisma/client';
import { createOzgunKidsService, FixedFormError } from '../lib/fixed-forms/ozgun-kids-service';
export function createOzgunKidsRouter(deps:{prisma:PrismaClient;auth:any;checkRole:(roles:string[])=>any;databaseAvailable:()=>boolean;assertOwnership:(req:any,res:any,id:string)=>Promise<boolean>}) {
  const router=express.Router(),service=createOzgunKidsService(deps.prisma);
  const paths=['/fixed-forms/ozgun-kids','/sessions/:id/fixed-form'];
  router.use(paths,deps.auth);
  router.use(paths,(_req,res,next)=>{if(!deps.databaseAvailable()){res.status(503).json({error:'Sınav için veritabanı bağlantısı gerekir.'});return;}next();});
  const run=(fn:(req:any,res:any)=>Promise<any>)=>async(req:any,res:any)=>{try{await fn(req,res);}catch(error){res.status(error instanceof FixedFormError?error.status:500).json({error:error instanceof FixedFormError?error.message:'Sınav işlemi tamamlanamadı.'});}};
  const staff=deps.checkRole(['SUPER_ADMIN','ASSESSMENT_DIRECTOR','INST_ADMIN']);
  function orgFor(req:any):string {
    const org=req.user.role==='INST_ADMIN'||req.user.role==='CANDIDATE'?req.user.organizationId:req.body?.organizationId??req.query.organizationId??req.user.organizationId;
    if(typeof org!=='string'||!org||org.length>128)throw new FixedFormError('Kurum seçin.');
    if(req.body?.organizationId && req.body.organizationId!==org)throw new FixedFormError('Kurum uyuşmuyor.',403);
    return org;
  }
  router.get('/fixed-forms/ozgun-kids/config',staff,run(async(req,res)=>res.json(await service.config(orgFor(req)))));
  router.put('/fixed-forms/ozgun-kids/config',staff,run(async(req,res)=>res.json(await service.saveConfig(orgFor(req),{answerKey:req.body.answerKey,confirmed:req.body.confirmed}))));
  router.post('/fixed-forms/ozgun-kids/launch',deps.checkRole(['CANDIDATE','SUPER_ADMIN','ASSESSMENT_DIRECTOR','INST_ADMIN']),run(async(req,res)=>{
    res.json(await service.launch(req.user.id,orgFor(req),req.user.role,req.user.email));
  }));
  router.get('/sessions/:id/fixed-form',run(async(req,res)=>{
    if(await deps.assertOwnership(req,res,req.params.id))res.json(await service.read(req.params.id));
  }));
  for(const action of ['start','answer','advance','listen'] as const) router.post(`/sessions/:id/fixed-form/${action}`,run(async(req,res)=>{
    if(req.user.role!=='CANDIDATE'&&!['SUPER_ADMIN','ASSESSMENT_DIRECTOR','INST_ADMIN'].includes(req.user.role))throw new FixedFormError('Bu sınavı düzenleme yetkiniz yok.',403);
    if(!await deps.assertOwnership(req,res,req.params.id))return;
    const result=action==='answer'?await service.answer(req.params.id,req.body.number,req.body.answer):
      action==='advance'?await service.advance(req.params.id,req.body.sectionIndex):await service[action](req.params.id);
    res.json(result);
  }));
  return router;
}
