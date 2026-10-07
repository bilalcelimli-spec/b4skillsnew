import express from 'express';
import type { PrismaClient } from '@prisma/client';
import { retryScoringJob, summarizeAdminQueue, unresolvedScoringWhere } from '../lib/scoring/admin-queue.js';

type Dependencies = {
  prisma: PrismaClient;
  checkRole: (roles: string[]) => express.RequestHandler;
  assertSessionOwnership: (req: any, res: any, sessionId: string) => Promise<boolean>;
  databaseAvailable: () => boolean;
  loadQueue: () => Promise<Pick<typeof import('../lib/scoring/scoring-queue.js'), 'enqueueScoringJob' | 'isScoringJobPending'>>;
};
const include = {item:{select:{skill:true,type:true,content:true}},ratingTask:{select:{status:true,score:true}},
  session:{include:{candidate:{select:{name:true,email:true}}}}} as const;
export function createAdminScoringRouter(deps: Dependencies) {
  const router = express.Router();
  router.use(deps.checkRole(['SUPER_ADMIN','INST_ADMIN','ASSESSMENT_DIRECTOR']));
  router.use((_req,res,next)=>{if(!deps.databaseAvailable()){res.status(503).json({error:'Database unavailable'});return;}next();});
  router.get('/',async(req:any,res)=>{
    try {
      if(req.user?.role==='INST_ADMIN' && !req.user.organizationId){res.status(403).json({error:'Organization required'});return;}
      const tenant = req.user?.role==='INST_ADMIN'?{organizationId:req.user.organizationId}:{};
      const responses = await deps.prisma.response.findMany({where:{...unresolvedScoringWhere,
        session:{...tenant,status:{in:['COMPLETED','IN_PROGRESS']}}},include,orderBy:{createdAt:'asc'}});
      res.json(summarizeAdminQueue(responses));
    } catch {res.status(500).json({error:'Could not load scoring queue'});}
  });
  router.post('/:sessionId/requeue',async(req,res)=>{
    try {
      const sessionId = String(req.params.sessionId);
      if(!await deps.assertSessionOwnership(req,res,sessionId))return;
      const responses = await deps.prisma.response.findMany({where:{...unresolvedScoringWhere,sessionId},include});
      const queue = await deps.loadQueue();
      let queued=0,skipped=0;
      for(const response of responses){
        const job=retryScoringJob(response);
        if(!job || queue.isScoringJobPending(response.id)){skipped++;continue;}
        void queue.enqueueScoringJob(job).catch(()=>undefined);queued++;
      }
      res.json({ok:true,queued,skipped});
    } catch {res.status(500).json({error:'Could not requeue scoring'});}
  });
  return router;
}
