import { describe, expect, it } from 'vitest';
import { buildAssessmentReport, practicePriorities, type ReportSession } from '../src/lib/reporting/assessment-report-model';
import { generateAssessmentReportPdf } from '../src/lib/reporting/assessment-report-pdf';

const now = new Date('2026-10-01T12:00:00Z');
function session(overrides: Partial<ReportSession> = {}): ReportSession {
  return {
    id: 'exam-id', status: 'COMPLETED', candidate: { name: 'Çağrı Çelimli Şen' },
    completedAt: '2026-09-30T10:00:00Z', theta: -0.05, sem: 0.35,
    scoreReport: { id: 'report-id', isVerified: true, overallCefr: 'B1' },
    responses: [], ...overrides,
  };
}
const build = (s: ReportSession) => buildAssessmentReport(s, 'https://b4skills.com/', now);

describe('evidence-aware candidate reports', () => {
  it('does not invent skill results from the overall theta or a stored percentage', () => {
    const r = build(session({ responses: [{ item: { skill: 'READING' } }], scoreReport: { readingScore: 60, overallCefr: 'B1' } }));
    expect(r.skills[0]).toMatchObject({ theta: null, cefr: null, state: 'Result unavailable', count: 1 });
    expect(r.skills[1]).toMatchObject({ cefr: null, state: 'Not assessed', count: 0 });
  });
  it('uses stored CEFR classification rather than silently changing it', () => {
    expect(build(session({ scoreReport: { overallCefr: 'B2' } })).cefr).toBe('B2');
  });
  it('normalises profile keys and excludes pretest counts', () => {
    const r = build(session({
      scoreReport: { diagnosticReport: { skillProfiles: { reading: { theta: 1, sem: 0.3 } } } },
      responses: [{ item: { skill: 'READING' } }, { isPretest: true, item: { skill: 'READING' } }],
    }));
    expect(r.skills[0]).toMatchObject({ cefr: 'B2', theta: 1, sem: 0.3, count: 1 });
  });
  it('marks pending AI results provisional and suppresses final verification', () => {
    const r = build(session({
      responses: [{ item: { skill: 'SPEAKING' }, metadata: { pendingAsyncScore: true } }],
      scoreReport: { isVerified: true, id: 'report-id', diagnosticReport: { skillProfiles: { SPEAKING: { theta: 1 } } } },
    }));
    expect(r.status).toBe('Provisional');
    expect(r.skills[3]).toMatchObject({ cefr: null, state: 'Scoring pending' });
    expect(r.verificationUrl).toBeNull();
  });
  it('does not retain stale pending metadata after responses are scored', () => {
    expect(build(session({ metadata: { pendingAsyncScoring: true }, responses: [{ metadata: { pendingAsyncScore: true, asyncScored: true } }] })).status).toBe('Completed');
  });
  it.each(['FLAGGED', 'SCORING', 'IN_PROGRESS', 'EXPIRED'])('does not issue verified certificates for %s', status => {
    expect(build(session({ status })).verificationUrl).toBeNull();
  });
  it('suppresses expired validity and provides a correctly encoded valid verification URL', () => {
    expect(build(session({ validUntil: '2026-01-01' })).status).toBe('Expired');
    expect(build(session()).verificationUrl).toBe('https://b4skills.com/verify/report-id');
  });
  it('does not default missing ability and uncertainty to fake values', () => {
    const r = build(session({ theta: NaN, currentTheta: Infinity, sem: -1, scoreReport: null }));
    expect(r.cefr).toBeNull();
    expect(r.beps).toBeNull();
    expect(r.interval).toBeNull();
  });
  it('calculates the model-based interval and keeps unknown counts unknown', () => {
    const r = build(session({ responses: undefined }));
    expect(r.beps).toBe(494);
    expect(r.interval).toMatchObject({ lower: 408, upper: 580 });
    expect(r.skills[0].count).toBeNull();
  });
  it('prioritises reported skills only, without fabricated item-level diagnoses', () => {
    const r = build(session({ scoreReport: { diagnosticReport: { skillProfiles: { READING: { theta: 1 }, LISTENING: { theta: -1.3 } } } } }));
    expect(practicePriorities(r).map(s => s.skill)).toEqual(['LISTENING', 'READING']);
  });
  it('renders Unicode names, long identity data, Pre-A1 and missing results without failing', async () => {
    const pdf = await generateAssessmentReportPdf(build(session({ candidate: { name: 'Çağrı Çelimli Şen '.repeat(12) }, theta: -4.1, scoreReport: { overallCefr: 'PRE_A1' } })));
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(15000);
  });
});
