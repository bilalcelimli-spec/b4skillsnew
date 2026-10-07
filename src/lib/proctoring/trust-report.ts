/** Heuristic review aid computed from stored events; reading never changes session status. */
export function buildTrustReport(sessionId: string, events: Array<{
  id: string; type: string; severity: number; timestamp: Date; metadata?: unknown;
}>) {
  const weights: Record<string, number> = {
    TAB_BLUR: 10, TAB_SWITCH: 10, WINDOW_BLUR: 10,
    FACE_NOT_DETECTED: 15, NO_FACE: 15, FACE_LOST: 15,
    AUDIO_ANOMALY: 5, HIGH_NOISE: 5, NOISE_DETECTED: 5,
    MULTIPLE_FACES: 30, UNAUTHORIZED_DEVICE: 50,
  };
  const penalty = events.reduce((sum, event) => sum + (weights[event.type] ?? 2) *
    Math.max(0, Math.min(5, Number.isFinite(event.severity) ? event.severity : 0)), 0);
  const trustScore = Math.max(0, 100 - penalty);
  const status = trustScore < 40 ? 'FAILED' : trustScore < 80 ? 'FLAGGED' : 'CLEAN';
  return { sessionId, trustScore, events, status,
    summary: events.length ? `${events.length} recorded events. Heuristic trust score: ${trustScore}/100; human review determines the assessment outcome.`
      : 'No proctoring events recorded. This does not establish that monitoring was active.',
  };
}
