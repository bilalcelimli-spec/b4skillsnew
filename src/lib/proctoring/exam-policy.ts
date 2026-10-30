import { createHash } from 'node:crypto';
import { z } from 'zod';
import { AppError } from '../errors/app-error.js';

import { ClientCapabilitiesSchema, ExamPreflightSchema } from '../../../shared/contracts/native-protocol.js';

// Shared with the native apps (shared/contracts/native-protocol.ts).
export const ClientCapabilities = ClientCapabilitiesSchema;
export const ExamPreflight = ExamPreflightSchema;
const Configuration = z.object({
  mode: z.enum(['standard', 'monitored', 'secure']).default('standard'),
  enforcePreflight: z.boolean().default(false),
  lifecycleEvents: z.boolean().default(false),
}).strict();

const BASE_DISCLOSURE = 'Konuşma yanıtları ses olarak gönderilir. Etkinleştirilmişse uygulamanın ön/arka plana geçiş zamanları teknik olay olarak kaydedilir. Teknik olay tek başına ihlal kararı değildir. Canlı insan gözetimi yapılmaz.';
export const CAMERA_DISCLOSURE = 'Sınav boyunca kamera açık kalır; yüzler cihazda sayılır ve video gönderilmez. Tek yüz göründüğünde bir başlangıç fotoğrafı otomatik olarak çekilip kuruma gönderilir.';

/** Tenant-controlled rollout; malformed configuration never downgrades to standard. */
export function examPolicy(settings: unknown) {
  const raw = (settings as Record<string, unknown> | null)?.nativeExamPolicy;
  const parsed = Configuration.safeParse(raw === undefined ? {} : raw);
  if (!parsed.success) throw new AppError(503, 'EXAM_POLICY_INVALID', 'Sınav politikası yapılandırılamadı. Kurumunuzla iletişime geçin.');
  const config = parsed.data;
  // The native camera is on unless the tenant switched it off (see cameraPilot in native-evidence.ts).
  const camera = (settings as any)?.nativeCameraPilot?.enabled !== false;
  const policy = {
    version: 1 as const, mode: config.mode,
    enforcePreflight: config.enforcePreflight || config.mode !== 'standard' || config.lifecycleEvents,
    required: {
      microphone: true,
      lifecycleEvents: config.lifecycleEvents || config.mode !== 'standard',
      durableEvents: config.lifecycleEvents || config.mode !== 'standard',
      cameraEvidence: config.mode !== 'standard', assessmentMode: config.mode === 'secure',
    },
    disclosure: (camera ? CAMERA_DISCLOSURE + ' ' : '') + BASE_DISCLOSURE,
  };
  return { ...policy, revision: createHash('sha256').update(JSON.stringify(policy)).digest('hex') };
}
export type ExamPolicy = ReturnType<typeof examPolicy>;

export function admitExam(policy: ExamPolicy, preflight?: z.infer<typeof ExamPreflight>) {
  if (!preflight) {
    if (policy.enforcePreflight) throw new AppError(428, 'EXAM_PREFLIGHT_REQUIRED', 'Sınav öncesi cihaz kontrolü gerekli.');
    return undefined; // Default rollout retains compatibility with existing web clients.
  }
  if (preflight.policyRevision !== policy.revision) throw new AppError(409, 'EXAM_POLICY_CHANGED', 'Sınav koşulları değişti. Cihaz kontrolünü yenileyin.');
  const missing = Object.entries(policy.required).filter(([key, required]) => required && !preflight.capabilities[key as keyof typeof policy.required]).map(([key]) => key);
  if (missing.length) throw new AppError(422, 'EXAM_CAPABILITY_REQUIRED', `Bu cihaz sınav koşullarını karşılamıyor: ${missing.join(', ')}.`);
  // Acknowledgement is a disclosure receipt, not a legal-consent or OS attestation claim.
  return { policy, capabilities: preflight.capabilities, acknowledgedAt: new Date().toISOString() };
}

/** Recheck under the same tenant row lock used by credit consumption. */
export async function admitCurrentExam(
  tx: Pick<import('@prisma/client').Prisma.TransactionClient, '$queryRaw' | 'organization'>,
  organizationId: string,
  preflight?: z.infer<typeof ExamPreflight>,
) {
  await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organizationId} FOR UPDATE`;
  const org = await tx.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { settings: true } });
  return admitExam(examPolicy(org.settings), preflight);
}
