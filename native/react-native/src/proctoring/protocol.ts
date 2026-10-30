// Wire types come from the contract shared with the server (shared/contracts). Only types are
// imported from native-protocol.ts, so zod stays out of the app bundle; the server's contract
// test (test/native-contract.test.ts) keeps these checks and its schemas in step.
import { CAPABILITY_KEYS, POLICY_MODES } from '../../../../shared/contracts/native-constants';
import type {
  CapabilityKey, ClientCapabilities, ExamPolicy, ExamPreflight,
} from '../../../../shared/contracts/native-protocol';
export type { ClientCapabilities, ExamPolicy, NativeEvent } from '../../../../shared/contracts/native-protocol';
export type Preflight = ExamPreflight;
export type ExamAdmission = { policy: ExamPolicy; capabilities: ClientCapabilities; acknowledgedAt: string };

const capabilityNames: Record<CapabilityKey, string> = { microphone: 'Mikrofon izni', lifecycleEvents: 'Uygulama geçiş olayları', durableEvents: 'Teknik olay kaydı', cameraEvidence: 'Kamera kanıtı', assessmentMode: 'Apple güvenli değerlendirme modu' };
export function validatePolicy(policy: ExamPolicy): void {
  // A newer protocol than this build knows: ask for an update rather than guessing.
  if (policy?.version !== 1 || !/^[a-f0-9]{64}$/.test(policy.revision) || !(POLICY_MODES as readonly string[]).includes(policy.mode)) {
    throw new Error('Desteklenmeyen sınav politikası. Uygulamayı güncelleyin.');
  }
  // `required` must name exactly the capabilities this build knows; an unknown one cannot be met.
  const required = policy.required as Record<string, unknown> | undefined;
  if (typeof policy.disclosure !== 'string' || typeof policy.enforcePreflight !== 'boolean' || !required
    || Object.keys(required).length !== CAPABILITY_KEYS.length
    || CAPABILITY_KEYS.some(k => typeof required[k] !== 'boolean')) {
    throw new Error('Sınav politikası doğrulanamadı.');
  }
}
export function missingCapabilities(policy: ExamPolicy, capabilities: ClientCapabilities): string[] {
  validatePolicy(policy);
  return CAPABILITY_KEYS.filter(k => policy.required[k] && !capabilities[k]).map(k => capabilityNames[k]);
}
