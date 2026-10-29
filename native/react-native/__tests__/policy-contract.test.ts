// The app's reading of the exam policy (wire contract: shared/contracts/native-protocol.ts).
// Moved from the server suite, which must not import app code.
import { missingCapabilities, type ClientCapabilities, type ExamPolicy } from '../src/proctoring/protocol';

const capabilities: ClientCapabilities = { version: 1, platform: 'ipad', microphone: true, lifecycleEvents: true, durableEvents: true, cameraEvidence: false, assessmentMode: false };
const policy = (required: Partial<ExamPolicy['required']> = {}, mode: ExamPolicy['mode'] = 'standard'): ExamPolicy => ({
  version: 1, revision: 'a'.repeat(64), mode, enforcePreflight: mode !== 'standard', disclosure: 'x',
  required: { microphone: true, lifecycleEvents: false, durableEvents: false, cameraEvidence: false, assessmentMode: false, ...required },
});

it('names the capability a monitored or secure exam needs and this device lacks', () => {
  expect(missingCapabilities(policy({ cameraEvidence: true, lifecycleEvents: true, durableEvents: true }, 'monitored'), capabilities)).toEqual(['Kamera kanıtı']);
  expect(missingCapabilities(policy({ cameraEvidence: true, assessmentMode: true }, 'secure'), capabilities)).toEqual(['Kamera kanıtı', 'Apple güvenli değerlendirme modu']);
  expect(missingCapabilities(policy(), capabilities)).toEqual([]);
});

it('refuses a capability this build does not know, and a newer protocol', () => {
  expect(() => missingCapabilities({ ...policy(), required: { ...policy().required, faceIdentity: true } } as unknown as ExamPolicy, capabilities)).toThrow(/doğrulanamadı/);
  expect(() => missingCapabilities({ ...policy(), version: 2 } as unknown as ExamPolicy, capabilities)).toThrow(/Uygulamayı güncelleyin/);
});

it('ignores unknown top-level fields so the server can add one safely', () => {
  expect(missingCapabilities({ ...policy(), addedLater: true } as unknown as ExamPolicy, capabilities)).toEqual([]);
});
