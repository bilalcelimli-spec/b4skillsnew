/**
 * Plain constants of the native wire contract. No imports, so the apps can use them at runtime
 * without bundling zod (≈400 KB). Schemas built from these live in native-protocol.ts.
 */
export const NATIVE_PLATFORMS = ['ipad', 'macos', 'android'] as const;

/** Capabilities an exam policy can require. */
export const CAPABILITY_KEYS = ['microphone', 'lifecycleEvents', 'durableEvents', 'cameraEvidence', 'assessmentMode'] as const;

export const POLICY_MODES = ['standard', 'monitored', 'secure'] as const;

/** Event types the native apps send. The server's event schema accepts a superset. */
export const NATIVE_EVENT_TYPES = ['TAB_BLUR', 'TAB_FOCUS', 'OTHER', 'FACE_NOT_DETECTED', 'MULTIPLE_FACES'] as const;
