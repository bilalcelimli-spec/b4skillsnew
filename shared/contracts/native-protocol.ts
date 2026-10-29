/**
 * Wire contract between the server and the native apps (iPad, macOS, Android).
 * Single source of truth: the server validates requests with these schemas and the apps derive
 * their types from them, so a change on one side is a compile or test failure on the other.
 *
 * The apps import only types from this file (erased at build time) and runtime values from
 * native-constants.ts, so zod never reaches the app bundle.
 *
 * Rules for this folder:
 *   - Only `zod` and ./native-constants may be imported (no Node, React Native or server modules).
 *   - Changing a shape is a protocol change: bump its `version` literal and keep the old one
 *     accepted until every shipped app build has moved on.
 */
import { z } from 'zod';
import { CAPABILITY_KEYS, NATIVE_EVENT_TYPES, NATIVE_PLATFORMS, POLICY_MODES } from './native-constants.js';

export { CAPABILITY_KEYS, NATIVE_EVENT_TYPES, NATIVE_PLATFORMS, POLICY_MODES };
export const NativePlatformSchema = z.enum(NATIVE_PLATFORMS);
export type NativePlatform = z.infer<typeof NativePlatformSchema>;

/** What a device proved it can do during the pre-exam check. */
export const ClientCapabilitiesSchema = z.object({
  version: z.literal(1), platform: NativePlatformSchema,
  microphone: z.boolean(), lifecycleEvents: z.boolean(), durableEvents: z.boolean(),
  cameraEvidence: z.boolean(), assessmentMode: z.boolean(),
}).strict();
export type ClientCapabilities = z.infer<typeof ClientCapabilitiesSchema>;

export type CapabilityKey = typeof CAPABILITY_KEYS[number];

const Revision = z.string().regex(/^[a-f0-9]{64}$/);

/**
 * Exam policy as the server sends it (GET /api/assessment/policy).
 * Tolerant reader: unknown top-level fields are dropped, so the server can add one without
 * breaking apps already installed. `required` stays strict: an app must refuse a capability it
 * does not know, because it cannot satisfy it.
 */
export const ExamPolicySchema = z.object({
  version: z.literal(1), revision: Revision,
  mode: z.enum(POLICY_MODES),
  enforcePreflight: z.boolean(),
  disclosure: z.string(),
  required: z.object({
    microphone: z.boolean(), lifecycleEvents: z.boolean(), durableEvents: z.boolean(),
    cameraEvidence: z.boolean(), assessmentMode: z.boolean(),
  }).strict(),
});
export type ExamPolicy = z.infer<typeof ExamPolicySchema>;

/** The device check result sent with an exam launch. */
export const ExamPreflightSchema = z.object({
  policyRevision: Revision, accepted: z.literal(true), capabilities: ClientCapabilitiesSchema,
}).strict();
export type ExamPreflight = z.infer<typeof ExamPreflightSchema>;

/** Proctoring event v2 as the native apps send it (POST /api/proctoring/event). */
export const NativeEventSchema = z.object({
  version: z.literal(2), eventId: z.string().uuid(),
  sequence: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  sessionId: z.string().min(1).max(100), platform: NativePlatformSchema,
  eventType: z.enum(NATIVE_EVENT_TYPES), severity: z.literal('INFO'),
  timestamp: z.string().datetime(),
  metadata: z.object({ reason: z.string().max(500) }).strict(),
}).strict();
export type NativeEvent = z.infer<typeof NativeEventSchema>;

/**
 * Public app configuration (GET /api/native/app-config, no sign-in).
 * minimumBuild: the lowest build number per platform the server still supports. An app below
 * it must ask the candidate to update before any exam. Tolerant reader on both levels, so a
 * new platform can be added without affecting installed apps.
 */
export const NativeAppConfigSchema = z.object({
  version: z.literal(1),
  minimumBuild: z.object({
    ipad: z.number().int().nonnegative(), macos: z.number().int().nonnegative(), android: z.number().int().nonnegative(),
  }),
});
export type NativeAppConfig = z.infer<typeof NativeAppConfigSchema>;
