/** Shared, candidate-visible pause policy. All dates and limits are server-owned. */
export const RESUME_WINDOW_MS = 48 * 60 * 60 * 1000;
export function pauseInfo(session: any, now = Date.now()) {
  const pause = session.metadata?.examPause;
  const used = !!pause?.pausedAt;
  const resumeUntil = typeof pause?.resumeUntil === 'string' ? pause.resumeUntil : null;
  return {used, pausedAt: pause?.pausedAt ?? null, resumeUntil,
    canPause: session.status === 'IN_PROGRESS' && !used,
    canResume: session.status === 'PAUSED' && !!resumeUntil && now < new Date(resumeUntil).getTime()};
}
export function effectiveSessionStart(session: any): Date | null {
  if (!session?.startedAt) return null;
  const pausedMs = session.metadata?.examPause?.totalPausedMs;
  return new Date(new Date(session.startedAt).getTime() + (Number.isFinite(pausedMs) && pausedMs > 0 ? pausedMs : 0));
}
