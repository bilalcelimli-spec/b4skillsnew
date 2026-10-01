/** Serialize refreshes per session so simultaneous scoring completions cannot overwrite newer reports. */
const refreshes = new Map<string, Promise<void>>();
export async function refreshScoredSession(sessionId: string): Promise<void> {
  const previous = refreshes.get(sessionId) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(async () => {
    const { AssessmentService } = await import('../assessment-engine/server-engine.js');
    await AssessmentService.refreshSessionScoring(sessionId);
  });
  refreshes.set(sessionId, next);
  try { await next; }
  finally { if (refreshes.get(sessionId) === next) refreshes.delete(sessionId); }
}
