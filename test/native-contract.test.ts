// Server and native apps share shared/contracts/native-protocol.ts. These checks make a drift
// between what the server produces or accepts and what the apps send or expect fail in CI.
import { describe, it, expect } from 'vitest';
import {
  CAPABILITY_KEYS, ExamPolicySchema, NATIVE_EVENT_TYPES, NATIVE_PLATFORMS, NativeAppConfigSchema, NativeEventSchema,
} from '../shared/contracts/native-protocol';
import { nativeAppConfig } from '../src/lib/proctoring/native-app-config';
import { examPolicy } from '../src/lib/proctoring/exam-policy';
import { NativeProctoringEventBody } from '../src/lib/security/schemas/proctoring';
import { EvidenceReservationBody } from '../src/lib/proctoring/native-evidence';

const settings = [
  {}, { nativeExamPolicy: { mode: 'monitored' } }, { nativeExamPolicy: { mode: 'secure' } },
  { nativeExamPolicy: { lifecycleEvents: true } }, { nativeCameraPilot: { enabled: false, retentionDays: 7 } },
];

describe('native wire contract', () => {
  it('every policy the server can produce is one the apps accept', () => {
    for (const s of settings) {
      const policy = examPolicy(s);
      expect(ExamPolicySchema.safeParse(policy).success).toBe(true);
      expect(Object.keys(policy.required).sort()).toEqual([...CAPABILITY_KEYS].sort());
    }
  });

  it('every event type and platform the apps send is accepted by the server', () => {
    for (const platform of NATIVE_PLATFORMS) {
      for (const eventType of NATIVE_EVENT_TYPES) {
        const event = NativeEventSchema.parse({
          version: 2, eventId: '0b5c3a6e-5d2b-4c1f-9a7e-1f2d3c4b5a69', sequence: 3,
          sessionId: 'cmabc123session', platform, eventType, severity: 'INFO',
          timestamp: '2026-10-30T09:00:00.000Z', metadata: { reason: 'native-lifecycle-background' },
        });
        expect(NativeProctoringEventBody.safeParse(event).success).toBe(true);
      }
    }
  });

  it('camera evidence accepts every native platform', () => {
    for (const platform of NATIVE_PLATFORMS) {
      const parsed = EvidenceReservationBody.safeParse({
        version: 1, evidenceId: '0b5c3a6e-5d2b-4c1f-9a7e-1f2d3c4b5a69', sessionId: 'cmabc123session', platform,
        kind: 'baseline', mimeType: 'image/jpeg', sha256: 'a'.repeat(64), bytes: 1000,
        capturedAt: '2026-10-30T09:00:00.000Z', faceCount: 1,
      });
      expect(parsed.success).toBe(true);
    }
  });

  it('app config: minimum builds from NATIVE_MIN_BUILD, never locking everyone out by mistake', () => {
    expect(nativeAppConfig(undefined)).toEqual({ version: 1, minimumBuild: { ipad: 0, macos: 0, android: 0 } });
    expect(nativeAppConfig('{"ipad":8,"macos":8}').minimumBuild).toEqual({ ipad: 8, macos: 8, android: 0 });
    for (const bad of ['not json', '{"ipad":"8"}', '{"ipad":-1}', '{"iphone":3}', '[8]']) {
      expect(nativeAppConfig(bad).minimumBuild).toEqual({ ipad: 0, macos: 0, android: 0 });
    }
    expect(NativeAppConfigSchema.safeParse(nativeAppConfig('{"android":2}')).success).toBe(true);
  });
});
