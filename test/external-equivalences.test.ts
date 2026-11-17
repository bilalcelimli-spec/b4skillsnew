import { describe, expect, it } from 'vitest';
import { CEFR_META, type CefrLevel } from '../src/lib/cefr/cefr-framework';
import { PRODUCT_LINE_PROFILES } from '../src/lib/product-lines/profiles';
import {
  audienceForProfile, EQUIVALENCE_SOURCES, EQUIVALENCE_TABLE, externalEquivalences, formatSourceDate,
} from '../src/lib/reporting/external-equivalences';
import { buildReportDocument, certificateAvailable } from '../src/lib/reporting/report-document';
import { SAMPLE_ADULT, SAMPLE_JUNIOR, SAMPLE_PRIMARY, SAMPLE_PROVISIONAL } from './fixtures/report-document-samples';

const LEVELS = Object.keys(CEFR_META) as CefrLevel[];
const lower = (range: string | null) => range === null ? null : Number(range.split('–')[0]);

describe('external equivalence table', () => {
  it('covers every CEFR level the platform reports', () => {
    expect(Object.keys(EQUIVALENCE_TABLE).sort()).toEqual([...LEVELS].sort());
  });

  it('matches the published owner alignments exactly', () => {
    // IELTS and the CEFR chart (ielts.org)
    expect(LEVELS.map(l => EQUIVALENCE_TABLE[l].IELTS)).toEqual([null, null, null, '4.0–5.0', '5.5–6.5', '7.0–8.0', '8.5–9.0']);
    // ETS (April 2026) Table 7: 1–6 band → CEFR
    expect(LEVELS.map(l => EQUIVALENCE_TABLE[l].TOEFL_BAND)).toEqual([null, '1–1.5', '2–2.5', '3–3.5', '4–4.5', '5–5.5', '6']);
    // ETS Table 6 total minimums: 1.5=12, 2=24, 3=44, 4=72, 5=95, 6=114
    expect(LEVELS.map(l => EQUIVALENCE_TABLE[l].TOEFL_LEGACY)).toEqual([null, '0–23', '24–43', '44–71', '72–94', '95–113', '114–120']);
    // Pearson PTE Academic Institution Score Guide (July 2025), Appendix
    expect(LEVELS.map(l => EQUIVALENCE_TABLE[l].PTE)).toEqual([null, '10–29', '30–42', '43–58', '59–75', '76–84', '85–90']);
  });

  it('is monotonic and contiguous for each numeric scale', () => {
    for (const key of ['IELTS', 'TOEFL_LEGACY', 'PTE'] as const) {
      const ranges = LEVELS.map(l => EQUIVALENCE_TABLE[l][key]).filter((r): r is string => r !== null);
      const mins = ranges.map(lower);
      expect([...mins].sort((a, b) => a! - b!)).toEqual(mins);
    }
    const legacy = LEVELS.map(l => EQUIVALENCE_TABLE[l].TOEFL_LEGACY).filter((r): r is string => r !== null);
    for (let i = 1; i < legacy.length; i++) expect(lower(legacy[i])).toBe(Number(legacy[i - 1].split('–')[1]) + 1);
    const pte = LEVELS.map(l => EQUIVALENCE_TABLE[l].PTE).filter((r): r is string => r !== null);
    for (let i = 1; i < pte.length; i++) expect(lower(pte[i])).toBe(Number(pte[i - 1].split('–')[1]) + 1);
  });

  it('names a source for every test', () => {
    for (const source of Object.values(EQUIVALENCE_SOURCES)) {
      expect(source.url).toMatch(/^https:\/\/(ielts\.org|www\.ets\.org|www\.pearsonpte\.com|www\.cambridgeenglish\.org)\//);
      expect(source.title.length).toBeGreaterThan(10);
    }
    expect(formatSourceDate(EQUIVALENCE_SOURCES.TOEFL_IBT, 'en')).toBe('April 2026');
    expect(formatSourceDate(EQUIVALENCE_SOURCES.PTE_ACADEMIC, 'tr')).toBe('Temmuz 2025');
    expect(formatSourceDate(EQUIVALENCE_SOURCES.IELTS, 'tr')).toBe('erişim 2026-11-17');
  });
});

describe('externalEquivalences', () => {
  it('returns nothing without a final level', () => {
    expect(externalEquivalences(null, 'adult')).toBeNull();
  });

  it('shows IELTS, TOEFL iBT and PTE for adults with an explicit not-official disclaimer', () => {
    const block = externalEquivalences('B2', 'adult', 'en')!;
    expect(block.rows.map(r => [r.test, r.range])).toEqual([['IELTS', '5.5–6.5'], ['TOEFL_IBT', '4–4.5'], ['PTE_ACADEMIC', '59–75']]);
    expect(block.rows[1].secondary).toContain('72–94');
    expect(block.disclaimer).toMatch(/not an official score/i);
    expect(block.sources.map(s => s.test)).toEqual(['IELTS', 'TOEFL_IBT', 'PTE_ACADEMIC']);
    expect(externalEquivalences('B2', 'adult', 'tr')!.disclaimer).toMatch(/resmî puan değildir/);
  });

  it('never invents an IELTS band below B1', () => {
    for (const l of ['PRE_A1', 'A1', 'A2'] as const) expect(externalEquivalences(l, 'adult')!.rows[0].range).toBeNull();
  });

  it('hides adult tests for young learners and uses Cambridge young-learner wording', () => {
    const block = externalEquivalences('A1', 'young_learner', 'tr')!;
    expect(block.rows).toHaveLength(1);
    expect(block.rows[0]).toMatchObject({ test: 'CAMBRIDGE_YL', range: 'A1 Movers' });
    expect(JSON.stringify(block.rows)).not.toMatch(/IELTS_|TOEFL_IBT|PTE/);
    expect(externalEquivalences('PRE_A1', 'young_learner')!.rows[0].range).toBe('Pre A1 Starters');
  });

  it('classifies Primary and Junior as young-learner profiles and adult products as adult', () => {
    expect(audienceForProfile(PRODUCT_LINE_PROFILES['Primary (7-10)'])).toBe('young_learner');
    expect(audienceForProfile(PRODUCT_LINE_PROFILES['Junior Suite (11-14)'])).toBe('young_learner');
    for (const name of ['General English', 'Academia', 'Corporate', '15-Min Diagnostic'] as const) {
      expect(audienceForProfile(PRODUCT_LINE_PROFILES[name])).toBe('adult');
    }
  });
});

describe('buildReportDocument', () => {
  const opts = { baseUrl: 'https://b4skills.com', now: new Date('2026-11-13T00:00:00Z') };

  it('builds a final adult report with rubric means from scored, non-pretest tasks only', () => {
    const withPretest = { ...SAMPLE_ADULT, responses: [...SAMPLE_ADULT.responses!, { itemId: 'pt', score: 0.9, isPretest: true, item: { skill: 'WRITING' }, metadata: { rubricScores: { grammar: 10, vocabulary: 10, coherence: 10, taskRelevance: 10 } } }] };
    const doc = buildReportDocument(withPretest as any, { ...opts, locale: 'en' });
    expect(doc.overall).toMatchObject({ cefrLabel: 'B2', final: true });
    expect(doc.test.durationMinutes).toBe(54);
    expect(doc.audience).toBe('adult');
    expect(doc.equivalences?.rows.map(r => r.range)).toEqual(['5.5–6.5', '4–4.5', '59–75']);
    const writing = doc.rubrics.find(r => r.skill === 'WRITING')!;
    expect(writing.tasks).toBe(2);
    expect(writing.dimensions.find(d => d.key === 'grammar')!.mean).toBe(5.8);
    expect(doc.rubrics.find(r => r.skill === 'SPEAKING')!.dimensions.map(d => d.key)).toContain('fluency');
    expect(doc.strengths.map(s => s.skill)).toEqual(['READING', 'GRAMMAR']);
    expect(doc.nextSteps.map(s => s.skill)).toEqual(['LISTENING', 'WRITING']);
    expect(certificateAvailable(doc)).toBe(true);
    const reading = doc.skills.find(s => s.skill === 'READING')!;
    expect(reading.band!.lower).toBeLessThan(reading.beps!);
    expect(reading.band!.upper).toBeGreaterThan(reading.beps!);
  });

  it('rejects unsafe organisation logo URLs', () => {
    const doc = buildReportDocument({ ...SAMPLE_ADULT, organization: { name: 'X', branding: { logoUrl: 'javascript:alert(1)' } } } as any, opts);
    expect(doc.issuer).toEqual({ name: 'X', logoUrl: null });
  });

  it('withholds equivalences and the certificate for a provisional result', () => {
    const doc = buildReportDocument(SAMPLE_PROVISIONAL as any, opts);
    expect(doc.overall.provisional).toBe(true);
    expect(doc.equivalences).toBeNull();
    expect(certificateAvailable(doc)).toBe(false);
  });

  it('uses young-learner alignment for Primary and Junior sessions', () => {
    const primary = buildReportDocument(SAMPLE_PRIMARY as any, { ...opts, locale: 'tr' });
    expect(primary.audience).toBe('young_learner');
    expect(primary.equivalences!.rows.map(r => r.range)).toEqual(['A1 Movers']);
    expect(primary.test.ageRange).toBe('7–10');
    expect(primary.skills).toHaveLength(PRODUCT_LINE_PROFILES['Primary (7-10)'].sectionOrder.length);
    const junior = buildReportDocument(SAMPLE_JUNIOR as any, opts);
    expect(junior.equivalences!.rows.map(r => r.range)).toEqual(['B1 Preliminary for Schools']);
  });

  it('omits skills outside the profile instead of reporting them as not assessed', () => {
    const academia = { ...SAMPLE_ADULT, metadata: { productLine: 'Academia' }, scoreReport: { ...(SAMPLE_ADULT.scoreReport as any), diagnosticReport: { ...(SAMPLE_ADULT.scoreReport as any).diagnosticReport, productLine: 'Academia' } } };
    const doc = buildReportDocument(academia as any, opts);
    expect(doc.skills.map(s => s.skill).sort()).toEqual(['LISTENING', 'READING', 'SPEAKING', 'WRITING']);
  });
});
