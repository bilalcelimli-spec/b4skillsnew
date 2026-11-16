/**
 * Exact historical non-media shapes only. These events are NOT proof of file deletion.
 * ProctoringMonitor emitted reason/timestamp before an independent upload request.
 * server.ts at 020c9f9 stored frameLength only; aa0baff (2026-09-29) added storage.
 * Restrict classification to the audited historical interval; unknown shapes fail closed.
 */
export function legacyScreenshotNotice(metadata: unknown, timestamp: Date): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const m = metadata as Record<string, unknown>;
  if (typeof m.reason !== 'string' || !Number.isFinite(timestamp.getTime()) || timestamp >= new Date('2026-09-29T00:00:00Z')) return null;
  const keys = Object.keys(m).sort().join(',');
  if (keys === 'reason,timestamp' && typeof m.timestamp === 'string' && Number.isFinite(Date.parse(m.timestamp))) return 'legacy-capture-attempt';
  if (keys === 'capturedAt,frameLength,reason' && timestamp >= new Date('2026-09-15T00:00:00Z') &&
      typeof m.capturedAt === 'string' && Number.isFinite(Date.parse(m.capturedAt)) &&
      typeof m.frameLength === 'number' && Number.isInteger(m.frameLength) && m.frameLength > 0) return 'legacy-frame-length-only';
  return null;
}
