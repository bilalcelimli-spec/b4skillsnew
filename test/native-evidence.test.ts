import { createHash, randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { cameraPilot, EvidenceReservationBody, EvidenceCommitBody, validatePhoto } from '../src/lib/proctoring/native-evidence';
import { sampleJPEG, photoReservation } from './helpers/native-evidence';
import { buildTrustReport } from '../src/lib/proctoring/trust-report';
describe('native camera evidence boundary', () => {
  it('never penalizes native technical/photo observations while retaining real risk signals', () => {
    const baseline = { id: 'evidence_test', type: 'SCREENSHOT', severity: 1, timestamp: new Date(), metadata: { reservationDigest: 'abc' } };
    const focus = { id: 'native_test', type: 'TAB_BLUR', severity: 1, timestamp: new Date(), metadata: { nativeProtocol: { version: 2 } } };
    expect(buildTrustReport('s1', [baseline, focus]).trustScore).toBe(100);
    expect(buildTrustReport('s1', [baseline, { ...focus, severity: 3 }]).trustScore).toBe(70);
    expect(buildTrustReport('s1', [baseline, focus]).events).toHaveLength(2);
  });
  it('defaults off and rejects malformed pilot settings instead of guessing', () => {
    expect(cameraPilot({}).enabled).toBe(false);
    expect(cameraPilot({ nativeCameraPilot: { enabled: true, retentionDays: 7 } })).toEqual({ enabled: true, retentionDays: 7 });
    for (const p of [{ enabled: true }, { enabled: true, retentionDays: 0 }, { enabled: true, retentionDays: 31 }, { enabled: true, retentionDays: 7, public: true }]) expect(() => cameraPilot({ nativeCameraPilot: p })).toThrow();
  });
  it.each([{ faceCount: 0 }, { faceCount: 2 }, { bytes: 1000001 }, { platform: 'iphone' }, { mimeType: 'image/png' }, { sha256: 'abc' }, { evidenceId: '../image' }, { extra: true }])('rejects invalid reservation %j', patch => {
    expect(EvidenceReservationBody.safeParse({ ...photoReservation(), ...patch }).success).toBe(false);
  });
  it('validates actual JPEG decoding and byte integrity', () => {
    expect(validatePhoto(sampleJPEG(), photoReservation()).width).toBe(2);
    expect(() => validatePhoto(Buffer.from('not jpeg'), photoReservation())).toThrow(/bütünlüğü/);
    const invalid = Buffer.from([255,216,1,2,255,217]);
    expect(() => validatePhoto(invalid, { ...photoReservation(), bytes: invalid.length, sha256: createHash('sha256').update(invalid).digest('hex') })).toThrow(/JPEG/);
  });
  it('accepts only bounded canonical base64, without URL/path uploads', () => {
    const body = { version: 1, evidenceId: randomUUID(), sessionId: 's1', base64: sampleJPEG().toString('base64') };
    expect(EvidenceCommitBody.safeParse(body).success).toBe(true);
    for (const patch of [{ base64: 'data:image/jpeg;base64,abcd' }, { base64: '____' }, { base64: 'a'.repeat(1333337) }, { url: 'http://localhost/secret' }]) expect(EvidenceCommitBody.safeParse({ ...body, ...patch }).success).toBe(false);
  });
});
