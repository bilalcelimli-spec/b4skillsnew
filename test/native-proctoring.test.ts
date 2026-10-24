import { describe, it, expect } from 'vitest';
import { admitExam, examPolicy, ExamPreflight } from '../src/lib/proctoring/exam-policy';
import { NativeProctoringEventBody, ProctoringEventBody } from '../src/lib/security/schemas/proctoring';
import { missingCapabilities } from '../native/react-native/src/proctoring/protocol';

const capabilities = { version: 1 as const, platform: 'ipad' as const, microphone: true, lifecycleEvents: true, durableEvents: true, cameraEvidence: false, assessmentMode: false };
describe('exam policy admission', () => {
  it('keeps legacy clients working only under the default, unmonitored rollout', () => {
    expect(admitExam(examPolicy({}))).toBeUndefined();
    for (const nativeExamPolicy of [{ enforcePreflight: true }, { lifecycleEvents: true }, { mode: 'monitored' }, { mode: 'secure' }]) {
      expect(() => admitExam(examPolicy({ nativeExamPolicy }))).toThrow(/cihaz kontrolü/);
    }
  });
  it('rejects invalid policy instead of silently weakening it', () => {
    for (const nativeExamPolicy of [null, { mode: 'unknown' }, { liveHuman: true }]) expect(() => examPolicy({ nativeExamPolicy })).toThrow(/yapılandırılamadı/);
  });
  it('requires the current server revision and a real acknowledgement', () => {
    const policy = examPolicy({});
    expect(ExamPreflight.safeParse({ policyRevision: policy.revision, accepted: false, capabilities }).success).toBe(false);
    expect(() => admitExam(policy, { policyRevision: 'a'.repeat(64), accepted: true, capabilities })).toThrow(/değişti/);
    expect(admitExam(policy, { policyRevision: policy.revision, accepted: true, capabilities })).toMatchObject({ policy, capabilities });
    expect(examPolicy({ unrelated: true }).revision).toBe(policy.revision);
  });
  it('blocks unsupported monitoring/security without consuming a credit or changing the profile', () => {
    for (const mode of ['monitored', 'secure']) {
      const policy = examPolicy({ nativeExamPolicy: { mode } });
      expect(missingCapabilities(policy, capabilities)).toContain('Kamera kanıtı');
      expect(() => admitExam(policy, { policyRevision: policy.revision, accepted: true, capabilities })).toThrow(/cameraEvidence/);
    }
  });
  it('native contract accepts server policy and refuses unknown required capabilities', () => {
    expect(missingCapabilities(examPolicy({}), capabilities)).toEqual([]);
    expect(() => missingCapabilities({ ...examPolicy({}), required: { ...examPolicy({}).required, faceIdentity: true } } as any, capabilities)).toThrow(/doğrulanamadı/);
  });
});
export const nativeEvent = {
  version: 2, eventId: '716e724c-f93e-4684-a1a2-b611bc67d823', sequence: 0, sessionId: 's1', platform: 'ipad',
  eventType: 'TAB_BLUR', severity: 'INFO', timestamp: '2026-10-24T09:00:00.000Z', metadata: { reason: 'native-lifecycle-background' },
};
describe('native event wire protocol', () => {
  it('accepts v2 and preserves canonical web event compatibility', () => {
    expect(NativeProctoringEventBody.parse(nativeEvent)).toEqual(nativeEvent);
    expect(ProctoringEventBody.safeParse({ sessionId: 's1', eventType: 'TAB_BLUR' }).success).toBe(true);
  });
  it.each([{ version: 3 }, { eventId: 'bad' }, { sequence: -1 }, { sequence: 1.5 }, { platform: 'iphone' }, { timestamp: 'yesterday' }, { screenshotUrl: 'https://example.test/x' }, { extra: true }])('rejects malformed v2 %j', override => {
    expect(ProctoringEventBody.safeParse({ ...nativeEvent, ...override }).success).toBe(false);
  });
});
