import { createHash } from 'node:crypto';
import { z } from 'zod';
import { decode, encode } from 'jpeg-js';
import type { PrismaClient } from '@prisma/client';
import { AppError } from '../errors/app-error.js';
import { storageReference, uploadPrivateObjectOnce } from '../storage/private-storage.js';

export const MAX_NATIVE_PHOTO_BYTES = 1_000_000;
export const EvidenceReservationBody = z.object({
  version: z.literal(1), evidenceId: z.string().uuid(), sessionId: z.string().regex(/^[a-z0-9_-]{1,100}$/i),
  platform: z.enum(['ipad', 'macos']), kind: z.literal('baseline'), mimeType: z.literal('image/jpeg'),
  sha256: z.string().regex(/^[a-f0-9]{64}$/), bytes: z.number().int().min(1).max(MAX_NATIVE_PHOTO_BYTES),
  capturedAt: z.string().datetime(), faceCount: z.literal(1),
}).strict();
export const EvidenceCommitBody = z.object({
  version: z.literal(1), evidenceId: z.string().uuid(), sessionId: z.string().regex(/^[a-z0-9_-]{1,100}$/i),
  base64: z.string().min(4).max(1_333_336).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),
}).strict();
export type EvidenceReservation = z.infer<typeof EvidenceReservationBody>;
const Pilot = z.object({ enabled: z.boolean(), retentionDays: z.number().int().min(1).max(30) }).strict();
export function cameraPilot(settings: unknown) {
  const raw = (settings as any)?.nativeCameraPilot;
  if (raw === undefined) return { enabled: false, retentionDays: 7 };
  const parsed = Pilot.safeParse(raw);
  if (!parsed.success) throw new AppError(503, 'CAMERA_POLICY_INVALID', 'Kamera pilotu yapılandırılamadı.');
  return parsed.data;
}
const rowId = (id: string) => `evidence_${id.toLowerCase()}`;
function fingerprint(body: EvidenceReservation) {
  return createHash('sha256').update(JSON.stringify([
    body.version, body.evidenceId.toLowerCase(), body.sessionId, body.platform, body.kind,
    body.mimeType, body.sha256, body.bytes, body.capturedAt, body.faceCount,
  ])).digest('hex');
}
export function validatePhoto(bytes: Buffer, reservation: EvidenceReservation) {
  if (bytes.length !== reservation.bytes || bytes.length > MAX_NATIVE_PHOTO_BYTES || createHash('sha256').update(bytes).digest('hex') !== reservation.sha256) {
    throw new AppError(422, 'EVIDENCE_DIGEST_MISMATCH', 'Fotoğraf bütünlüğü doğrulanamadı.');
  }
  try {
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) throw Error();
    const image = decode(bytes, { useTArray: true, maxResolutionInMP: 2, maxMemoryUsageInMB: 32, tolerantDecoding: false });
    if (!image.width || !image.height || image.width > 1280 || image.height > 1280) throw Error();
    return image;
  } catch { throw new AppError(422, 'EVIDENCE_IMAGE_INVALID', 'Geçerli, en fazla 1280 piksel JPEG fotoğraf gerekli.'); }
}
/** Routes must establish authenticated session ownership before calling these helpers. */
export async function reserveEvidence(db: PrismaClient, body: EvidenceReservation) {
  const id = rowId(body.evidenceId), digest = fingerprint(body);
  return db.$transaction(async tx => {
    // Serialize reservations per session; retries reuse the same quota slot.
    await tx.$queryRaw`SELECT id FROM "Session" WHERE id = ${body.sessionId} FOR UPDATE`;
    const existing = await tx.proctoringEvent.findUnique({ where: { id } });
    if (existing) {
      if (existing.sessionId !== body.sessionId || (existing.metadata as any)?.reservationDigest !== digest) throw new AppError(409, 'EVIDENCE_ID_CONFLICT', 'Kanıt kimliği farklı içerikle kullanılamaz.');
      if (existing.type === 'EVIDENCE_EXPIRED') throw new AppError(410, 'EVIDENCE_UPLOAD_EXPIRED', 'Fotoğraf saklama süresi doldu.');
      return { reserved: true, evidenceId: body.evidenceId, committed: existing.type === 'SCREENSHOT' };
    }
    const session = await tx.session.findUniqueOrThrow({ where: { id: body.sessionId }, include: { organization: { select: { settings: true } } } });
    const pilot = cameraPilot(session.organization?.settings);
    if (!pilot.enabled) throw new AppError(403, 'CAMERA_PILOT_DISABLED', 'Kamera pilotu bu kurumda açık değil.');
    if (session.status !== 'IN_PROGRESS') throw new AppError(409, 'EVIDENCE_SESSION_CLOSED', 'Fotoğraf için aktif sınav gerekli.');
    const now = Date.now(), capturedAt = Date.parse(body.capturedAt);
    if (capturedAt > now + 60_000 || capturedAt < now - 600_000) throw new AppError(422, 'EVIDENCE_CAPTURE_EXPIRED', 'Yeni fotoğraf çekin.');
    const count = await tx.proctoringEvent.count({ where: { sessionId: body.sessionId, id: { startsWith: 'evidence_' } } });
    if (count >= 3) throw new AppError(429, 'EVIDENCE_QUOTA', 'Bu oturumun fotoğraf sınırına ulaşıldı.');
    const key = `native/${body.sessionId}/${body.evidenceId.toLowerCase()}.jpg`;
    const reference = storageReference('proctoring', key);
    await tx.proctoringEvent.create({ data: {
      id, sessionId: body.sessionId, type: 'EVIDENCE_PENDING', severity: 1,
      metadata: { reservation: body, reservationDigest: digest, reference: { ...reference },
        reason: 'native-baseline-pending', uploadDeadline: new Date(now + 600_000).toISOString(),
        expiresAt: new Date(now + pilot.retentionDays * 86400_000).toISOString() },
    } });
    return { reserved: true, evidenceId: body.evidenceId, committed: false };
  });
}
export async function commitEvidence(db: PrismaClient, body: z.infer<typeof EvidenceCommitBody>, upload = uploadPrivateObjectOnce) {
  const event = await db.proctoringEvent.findUnique({ where: { id: rowId(body.evidenceId) } });
  if (!event || event.sessionId !== body.sessionId) throw new AppError(404, 'EVIDENCE_NOT_FOUND', 'Fotoğraf rezervasyonu bulunamadı.');
  if (event.type === 'EVIDENCE_EXPIRED') throw new AppError(410, 'EVIDENCE_UPLOAD_EXPIRED', 'Fotoğraf saklama süresi doldu.');
  const metadata = event.metadata as any;
  const reservation = EvidenceReservationBody.parse(metadata.reservation);
  const bytes = Buffer.from(body.base64, 'base64');
  const image = validatePhoto(bytes, reservation);
  if (event.type === 'SCREENSHOT') return { accepted: true, evidenceId: body.evidenceId, eventId: event.id };
  if (event.type !== 'EVIDENCE_PENDING' || Date.parse(metadata.uploadDeadline) < Date.now()) throw new AppError(410, 'EVIDENCE_UPLOAD_EXPIRED', 'Fotoğraf gönderim süresi doldu.');
  // Stable object key + immutable upload makes upload-success/response-loss retry safe.
  const sanitized = encode({ width: image.width, height: image.height, data: image.data }, 75).data;
  if (sanitized.length > MAX_NATIVE_PHOTO_BYTES) throw new AppError(422, 'EVIDENCE_IMAGE_INVALID', 'Fotoğraf boyutu çok büyük.');
  await upload(metadata.reference, sanitized, 'image/jpeg');
  await db.proctoringEvent.updateMany({ where: { id: event.id, type: 'EVIDENCE_PENDING' }, data: {
    type: 'SCREENSHOT', metadata: { ...metadata, reason: 'native-baseline',
      evidenceKey: metadata.reference.key, evidenceProvider: metadata.reference.provider, evidenceBucket: metadata.reference.bucket,
      capturedAt: reservation.capturedAt, committedAt: new Date().toISOString(),
      nativeCamera: { platform: reservation.platform, faceCount: reservation.faceCount, observationOnly: true } },
  } });
  const committed = await db.proctoringEvent.findUnique({ where: { id: event.id } });
  if (committed?.type !== 'SCREENSHOT' || (committed.metadata as any)?.reservationDigest !== metadata.reservationDigest) throw new AppError(503, 'EVIDENCE_COMMIT_UNCONFIRMED', 'Fotoğraf teslimi doğrulanamadı. Aynı fotoğrafla tekrar deneyin.');
  return { accepted: true, evidenceId: body.evidenceId, eventId: event.id };
}
