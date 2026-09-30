import { afterEach, expect, it, vi } from 'vitest';
import { legacyProctorEventTypes, proctoringEventPayload } from '../src/lib/proctoring/event-protocol';
import { ProctoringEventBody } from '../src/lib/security/schemas/proctoring';
import { ProctoringEventType, ProctoringService } from '../src/lib/proctoring/proctoring-service';
afterEach(() => vi.unstubAllGlobals());
it.each(legacyProctorEventTypes)('maps %s into a valid strict API payload', type => {
  for (const severity of ['LOW', 'MEDIUM', 'HIGH'] as const) {
    const payload = proctoringEventPayload('exam-cuid', type, severity, { count: 1 });
    expect(ProctoringEventBody.parse(payload)).toEqual(payload);
    expect(payload).not.toHaveProperty('type');
  }
});
it.each(legacyProctorEventTypes)('accepts only the bounded cached legacy %s event shape', type => {
  expect(ProctoringEventBody.parse({ sessionId: 'exam-cuid', type, severity: 'MEDIUM' }))
    .toEqual(proctoringEventPayload('exam-cuid', type, 'MEDIUM'));
});
it('distinguishes copy, paste and developer shortcuts', () => {
  expect(proctoringEventPayload('exam', 'COPY_PASTE', 'LOW', { action: 'copy' }).eventType).toBe('COPY_ATTEMPT');
  expect(proctoringEventPayload('exam', 'COPY_PASTE', 'MEDIUM', { action: 'paste' }).eventType).toBe('PASTE_ATTEMPT');
  expect(proctoringEventPayload('exam', 'COPY_PASTE', 'MEDIUM', { reason: 'devtools_shortcut' }).eventType).toBe('DEVTOOLS_DETECTED');
});
it('preserves timestamps and rejects ambiguous or unrecognized fields', () => {
  const payload = { sessionId: 'exam', type: 'TAB_SWITCH', severity: 'MEDIUM', timestamp: '2026-09-30T17:31:19.672Z' };
  expect(ProctoringEventBody.parse(payload).timestamp).toBe(payload.timestamp);
  expect(ProctoringEventBody.safeParse({ ...payload, eventType: 'TAB_BLUR' }).success).toBe(false);
  expect(ProctoringEventBody.safeParse({ ...payload, severity: 5 }).success).toBe(false);
  expect(ProctoringEventBody.safeParse({ ...payload, type: 'ARBITRARY_EVENT' }).success).toBe(false);
});
it('retains session, metadata and evidence limits for both request formats', () => {
  for (const payload of [{ sessionId: 'exam', type: 'TAB_SWITCH', severity: 'LOW' }, proctoringEventPayload('exam', 'TAB_SWITCH', 'LOW')]) {
    expect(ProctoringEventBody.safeParse({ ...payload, sessionId: '../exam' }).success).toBe(false);
    expect(ProctoringEventBody.safeParse({ ...payload, metadata: { nested: { forged: true } } }).success).toBe(false);
    expect(ProctoringEventBody.safeParse({ ...payload, metadata: Object.fromEntries(Array.from({ length: 21 }, (_, i) => [String(i), i])) }).success).toBe(false);
    expect(ProctoringEventBody.safeParse({ ...payload, screenshotUrl: 'javascript:bad' }).success).toBe(false);
  }
});
it('uses the canonical payload and session credentials in the shared sender', async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'persisted' }) });
  vi.stubGlobal('fetch', fetchMock);
  await ProctoringService.logEvent('exam', { sessionId: 'exam', type: ProctoringEventType.NO_FACE, severity: 'HIGH' });
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ sessionId: 'exam', eventType: 'FACE_NOT_DETECTED', severity: 'CRITICAL' });
  expect(fetchMock.mock.calls[0][1].credentials).toBe('include');
});
