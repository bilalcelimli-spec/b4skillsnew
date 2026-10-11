import type { PrismaClient } from '@prisma/client';
import { AppError } from '../errors/app-error';
import { getProfile } from '../product-lines/profiles';
import { OZGUN_SECTIONS } from '../fixed-forms/ozgun-kids';
import { DIAGNOSTIC_WALL_CLOCK_MS } from './diagnostic-config';
import { effectiveSessionStart, pauseInfo, RESUME_WINDOW_MS } from './session-pause';
import { sessionDeadlineReached } from './session-deadline';

export function createSessionPauseService(prisma: PrismaClient) {
  async function change(id: string, candidateId: string, action: 'pause' | 'resume', at?: Date, questionNumber?: number) {
    const result = await prisma.$transaction(async db => {
      await db.$queryRaw`SELECT id FROM "Session" WHERE id = ${id} FOR UPDATE`;
      const session = await db.session.findUnique({where: {id}});
      if (!session) throw AppError.notFound('Sınav bulunamadı.');
      // Staff ownership permissions must not grant the right to consume a student's pause.
      if (session.candidateId !== candidateId) throw AppError.forbidden('Yalnızca kendi sınavınızdan çıkabilirsiniz.');
      const now = at ?? new Date();
      const meta = (session.metadata ?? {}) as any;
      const info = pauseInfo({...session, metadata: meta}, now.getTime());
      if (session.status === 'PAUSED' && !info.canResume) {
        await db.session.update({where: {id}, data: {status: 'EXPIRED'}});
        return {expired: true as const};
      }
      if (action === 'pause') {
        // A retried request must preserve the original 48-hour deadline.
        if (session.status === 'PAUSED') return {status: session.status, pause: info};
        if (!info.canPause) throw AppError.conflict(info.used ? 'Sınavdan çıkış hakkınızı zaten kullandınız.' : 'Bu sınav duraklatılamaz.');
        const fixed = meta.sessionType === 'FIXED_FORM';
        const section = fixed ? OZGUN_SECTIONS[meta.fixedForm?.sectionIndex] : null;
        const deadline = fixed
          ? section && meta.fixedForm?.sectionStartedAt ? new Date(meta.fixedForm.sectionStartedAt).getTime() + section.minutes * 60000 : NaN
          : meta.sessionType === 'DIAGNOSTIC' ? new Date(meta.diagnosticState?.expiresAt).getTime() : NaN;
        const duration = meta.sessionType === 'DIAGNOSTIC' ? DIAGNOSTIC_WALL_CLOCK_MS : getProfile(meta.productLine).maxDurationMs;
        if (fixed ? !section || !Number.isFinite(deadline) || now.getTime() >= deadline
          : meta.sessionType === 'DIAGNOSTIC' ? !Number.isFinite(deadline) || now.getTime() >= deadline || meta.diagnosticState?.complete
          : sessionDeadlineReached(effectiveSessionStart(session), duration, now.getTime()))
          throw AppError.conflict('Sınavın veya bölümün süresi doldu. Çıkış hakkı kullanılamaz.');
        if (fixed && questionNumber !== undefined) {
          if (!Number.isInteger(questionNumber) || questionNumber < section!.first || questionNumber > section!.last)
            throw AppError.badRequest('Geçersiz soru numarası.');
          meta.fixedForm.resumeQuestion = questionNumber;
        }
        meta.examPause = {pausedAt: now.toISOString(), resumeUntil: new Date(now.getTime() + RESUME_WINDOW_MS).toISOString(), totalPausedMs: 0};
        await db.session.update({where: {id}, data: {status: 'PAUSED', metadata: meta}});
        return {status: 'PAUSED', pause: pauseInfo({status: 'PAUSED', metadata: meta}, now.getTime())};
      }
      // Resume is idempotent; duplicate calls cannot extend the test clock.
      if (session.status === 'IN_PROGRESS') return {status: session.status, pause: info};
      if (session.status !== 'PAUSED') throw AppError.conflict('Bu sınava devam edilemez.');
      const duration = Math.max(0, now.getTime() - new Date(meta.examPause.pausedAt).getTime());
      const shift = (value: string) => new Date(new Date(value).getTime() + duration).toISOString();
      meta.examPause = {...meta.examPause, resumedAt: now.toISOString(), totalPausedMs: duration};
      if (meta.fixedForm?.sectionStartedAt) {
        meta.fixedForm.sectionStartedAt = shift(meta.fixedForm.sectionStartedAt);
        if (meta.fixedForm.listeningStartedAt) meta.fixedForm.listeningStartedAt = shift(meta.fixedForm.listeningStartedAt);
      }
      if (meta.diagnosticState) {
        meta.diagnosticState.startedAt = shift(meta.diagnosticState.startedAt);
        meta.diagnosticState.expiresAt = shift(meta.diagnosticState.expiresAt);
      }
      await db.session.update({where: {id}, data: {status: 'IN_PROGRESS', metadata: meta}});
      return {status: 'IN_PROGRESS', pause: pauseInfo({status: 'IN_PROGRESS', metadata: meta}, now.getTime())};
    });
    if ('expired' in result) throw new AppError(410, 'RESUME_WINDOW_EXPIRED', '48 saatlik devam süresi doldu. Bu sınava artık devam edemezsiniz.');
    return result;
  }
  return {pause: (id: string, userId: string, questionNumber?: number) => change(id, userId, 'pause', undefined, questionNumber),
    resume: (id: string, userId: string) => change(id, userId, 'resume'), change};
}
