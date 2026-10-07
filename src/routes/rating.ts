import express from 'express';
import type { PrismaClient } from '@prisma/client';
import { RatingSubmitBody, RatingClaimBody } from '../lib/security/schemas/items.js';
import type { RatingQueueService } from '../lib/scoring/rating-queue.js';

type Dependencies = {
  prisma:PrismaClient;
  service:typeof RatingQueueService;
  checkRole:(roles:string[])=>express.RequestHandler;
  databaseAvailable:()=>boolean;
};
export function createRatingRouter(deps:Dependencies) {
  const router=express.Router();
  router.use(deps.checkRole(['SUPER_ADMIN','ASSESSMENT_DIRECTOR','RATER']));
  router.use((req:any,res,next)=>{if(typeof req.user?.id !== 'string' || !req.user.id){res.status(401).json({error:'Authenticated rater required'});return;}next();});
  router.use((_req,res,next)=>{if(!deps.databaseAvailable()){res.status(503).json({error:'Database unavailable'});return;}next();});
  router.get('/stats',async(_req,res)=>{
    try {
      const [pending,claimed,completed,flagged,recent]=await Promise.all([
        deps.prisma.ratingTask.count({where:{status:'PENDING'}}),deps.prisma.ratingTask.count({where:{status:'CLAIMED'}}),
        deps.prisma.ratingTask.count({where:{status:'COMPLETED'}}),deps.prisma.ratingTask.count({where:{status:'FLAGGED'}}),
        deps.prisma.ratingTask.findMany({where:{status:'COMPLETED'},select:{createdAt:true,updatedAt:true},orderBy:{updatedAt:'desc'},take:50}),
      ]);
      const avg=recent.length?recent.reduce((n,t)=>n+(+t.updatedAt-+t.createdAt),0)/recent.length:null;
      res.json({pending,claimed,completed,flagged,avgQwk:null,avgTurnaroundMs:avg===null?null:Math.round(avg)});
    } catch {res.status(500).json({error:'Could not load rating statistics'});}
  });
  router.get('/tasks',async(req:any,res)=>{
    const status=req.query.status??'PENDING';
    if(typeof status!=='string'||!['PENDING','CLAIMED','COMPLETED','FLAGGED'].includes(status)){
      res.status(400).json({error:'Invalid rating status'});return;
    }
    try {res.json(await deps.service.getTasks(status as any,req.user.id));}
    catch {res.status(500).json({error:'Could not load rating tasks'});}
  });
  const claim = (kind:'first'|'second'|'arbitration'):express.RequestHandler => async(req:any,res)=>{
    if(kind==='first'&&!RatingClaimBody.safeParse(req.body).success){res.status(400).json({error:'Invalid claim body'});return;}
    try {
      const method=kind==='first'?deps.service.claimTask:kind==='second'?deps.service.claimSecondRating:deps.service.claimArbitration;
      res.json(await method(String(req.params.id),req.user.id));
    } catch {res.status(409).json({error:'Task is unavailable or requires a different independent rater'});}
  };
  const submit = (kind:'first'|'second'|'arbitration'):express.RequestHandler => async(req:any,res)=>{
    const body=RatingSubmitBody.safeParse(req.body);
    if(!body.success){res.status(400).json({error:'Invalid rating body'});return;}
    try {
      const method=kind==='first'?deps.service.submitRating:kind==='second'?deps.service.submitSecondRating:deps.service.submitArbitration;
      res.json(await method(String(req.params.id),body.data.score,body.data.feedback,req.user.id));
    } catch {res.status(409).json({error:'Could not save this rating; reload the task before retrying'});}
  };
  router.post('/tasks/:id/claim',claim('first'));
  router.post('/tasks/:id/claim-second',claim('second'));
  router.post('/tasks/:id/claim-arbitration',claim('arbitration'));
  router.post('/tasks/:id/submit',submit('first'));
  router.post('/tasks/:id/submit-second',submit('second'));
  router.post('/tasks/:id/submit-arbitration',submit('arbitration'));
  return router;
}
