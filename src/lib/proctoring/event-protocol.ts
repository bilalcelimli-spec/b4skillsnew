/** Shared wire format; internal monitor event names must not leak into API fields. */
export const legacyProctorEventTypes = [
  'TAB_SWITCH', 'WINDOW_BLUR', 'MULTIPLE_FACES', 'NO_FACE', 'HIGH_NOISE',
  'COPY_PASTE', 'UNUSUAL_LATENCY', 'FULLSCREEN_EXIT', 'SCREENSHOT', 'CAMERA_UNAVAILABLE',
] as const;
type MonitorEventType = typeof legacyProctorEventTypes[number];
export function proctoringEventPayload(sessionId: string, type: MonitorEventType,
  severity: 'LOW' | 'MEDIUM' | 'HIGH', metadata?: Record<string, unknown>) {
  const eventTypes = {
    TAB_SWITCH: 'TAB_BLUR', WINDOW_BLUR: 'TAB_BLUR', MULTIPLE_FACES: 'MULTIPLE_FACES',
    NO_FACE: 'FACE_NOT_DETECTED', HIGH_NOISE: 'AUDIO_ANOMALY', COPY_PASTE: 'COPY_ATTEMPT',
    UNUSUAL_LATENCY: 'OTHER', FULLSCREEN_EXIT: 'FULLSCREEN_EXIT', SCREENSHOT: 'OTHER', CAMERA_UNAVAILABLE: 'OTHER',
  } as const;
  const severityTypes = { LOW: 'INFO', MEDIUM: 'WARNING', HIGH: 'CRITICAL' } as const;
  const eventType = type === 'COPY_PASTE' && metadata?.reason === 'devtools_shortcut' ? 'DEVTOOLS_DETECTED'
    : type === 'COPY_PASTE' && metadata?.action === 'paste' ? 'PASTE_ATTEMPT' : eventTypes[type];
  return { sessionId, eventType, severity: severityTypes[severity], ...(metadata ? { metadata } : {}) } as const;
}
