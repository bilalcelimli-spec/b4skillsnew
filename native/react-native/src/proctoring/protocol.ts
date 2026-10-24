export type ClientCapabilities = {
  version: 1; platform: 'ipad' | 'macos'; microphone: boolean; lifecycleEvents: boolean;
  durableEvents: boolean; cameraEvidence: boolean; assessmentMode: boolean;
};
export type ExamPolicy = {
  version: 1; revision: string; mode: 'standard' | 'monitored' | 'secure'; enforcePreflight: boolean;
  disclosure: string; required: Record<Exclude<keyof ClientCapabilities, 'version' | 'platform'>, boolean>;
};
export type Preflight = { policyRevision: string; accepted: true; capabilities: ClientCapabilities };
export type ExamAdmission = { policy: ExamPolicy; capabilities: ClientCapabilities; acknowledgedAt: string };
export type NativeEvent = {
  version: 2; eventId: string; sequence: number; sessionId: string; platform: 'ipad' | 'macos';
  eventType: 'TAB_BLUR' | 'TAB_FOCUS' | 'OTHER' | 'FACE_NOT_DETECTED' | 'MULTIPLE_FACES'; severity: 'INFO'; timestamp: string;
  metadata: { reason: string };
};

const capabilityNames = { microphone: 'Mikrofon izni', lifecycleEvents: 'Uygulama geçiş olayları', durableEvents: 'Teknik olay kaydı', cameraEvidence: 'Kamera kanıtı', assessmentMode: 'Apple güvenli değerlendirme modu' };
export function validatePolicy(policy: ExamPolicy): void {
  if (policy?.version !== 1 || !/^[a-f0-9]{64}$/.test(policy.revision) || !['standard', 'monitored', 'secure'].includes(policy.mode)) {
    throw new Error('Desteklenmeyen sınav politikası. Uygulamayı güncelleyin.');
  }
  if (typeof policy.disclosure !== 'string' || typeof policy.enforcePreflight !== 'boolean' || !policy.required
    || Object.keys(policy.required).length !== Object.keys(capabilityNames).length
    || Object.keys(policy.required).some(k => !Object.prototype.hasOwnProperty.call(capabilityNames, k) || typeof policy.required[k as keyof typeof capabilityNames] !== 'boolean')) {
    throw new Error('Sınav politikası doğrulanamadı.');
  }
}
export function missingCapabilities(policy: ExamPolicy, capabilities: ClientCapabilities): string[] {
  validatePolicy(policy);
  return (Object.keys(capabilityNames) as Array<keyof typeof capabilityNames>).filter(k => policy.required[k] && !capabilities[k]).map(k => capabilityNames[k]);
}
