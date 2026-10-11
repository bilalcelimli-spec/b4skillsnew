import express from 'express';
import type { PrismaClient } from '@prisma/client';
import { createSessionPauseService } from '../lib/assessment-engine/session-pause-service';
import { AppError } from '../lib/errors/app-error';
export function createSessionPauseRouter(deps: {prisma: PrismaClient; auth: any}) {
  const router = express.Router(), service = createSessionPauseService(deps.prisma);
  for (const action of ['pause', 'resume'] as const) {
    router.post(`/sessions/:id/${action}`, deps.auth, async (req: any, res) => {
      try { res.json(await (action === 'pause' ? service.pause(req.params.id, req.user.id, req.body?.questionNumber) : service.resume(req.params.id, req.user.id))); }
      catch (error) {
        if (error instanceof AppError) {res.status(error.statusCode).json({error: error.message, code: error.code}); return;}
        res.status(500).json({error: 'Sınav işlemi tamamlanamadı. Lütfen tekrar deneyin.'});
      }
    });
  }
  return router;
}
