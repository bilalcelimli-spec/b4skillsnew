import { createHash, randomUUID } from 'node:crypto';
import { encode } from 'jpeg-js';
import { EvidenceReservationBody } from '../../src/lib/proctoring/native-evidence';
export const sampleJPEG = () => encode({ width: 2, height: 2, data: Buffer.from(Array(4).fill([40, 80, 120, 255]).flat()) }, 75).data;
export function photoReservation(sessionId = 's1') {
  const bytes = sampleJPEG();
  return EvidenceReservationBody.parse({ version: 1, evidenceId: randomUUID(), sessionId, platform: 'ipad', kind: 'baseline',
    mimeType: 'image/jpeg', bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), capturedAt: new Date().toISOString(), faceCount: 1 });
}
