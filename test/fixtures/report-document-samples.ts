/**
 * Fictional sessions for the printable report/certificate: unit tests, the
 * Playwright renderer fixture and design review. Shapes mirror what
 * GET /api/sessions/:id/report-document loads from Prisma. Not real candidates.
 */
import { PRODUCT_LINE_PROFILES, type ProductLineName } from '../../src/lib/product-lines/profiles';
import type { ReportDocumentSession } from '../../src/lib/reporting/report-document';

type SkillProfile = { theta: number; sem: number; cefrLevel: string };

function session(opts: {
  id: string; name: string; product: ProductLineName; cefr: string; theta: number; sem: number;
  minutes: number; org: string; skills: Record<string, SkillProfile>;
  rubric?: { WRITING?: Record<string, number>[]; SPEAKING?: Record<string, number>[] };
  verified?: boolean;
}): ReportDocumentSession {
  const profile = PRODUCT_LINE_PROFILES[opts.product];
  const completedAt = new Date('2026-11-12T10:00:00Z');
  const startedAt = new Date(completedAt.getTime() - opts.minutes * 60000);
  const responses: NonNullable<ReportDocumentSession['responses']> = [];
  for (const skill of profile.sectionOrder.map(String)) {
    const rubric = opts.rubric?.[skill as 'WRITING' | 'SPEAKING'];
    const count = rubric?.length ?? (profile.sectionConfig[skill]?.minItems ?? 1) + 2;
    for (let i = 0; i < count; i++) {
      responses.push({
        itemId: `${opts.id}-${skill}-${i}`, score: (i % 3) / 2, isPretest: false, item: { skill },
        metadata: rubric ? { rubricScores: rubric[i], scoreSource: 'ai' } : {},
      } as any);
    }
  }
  const verified = opts.verified ?? true;
  return {
    id: opts.id, status: 'COMPLETED', candidate: { name: opts.name },
    startedAt, completedAt, validUntil: new Date('2028-11-12T10:00:00Z'),
    theta: opts.theta, sem: opts.sem, metadata: { productLine: opts.product },
    organization: { name: opts.org, branding: {} },
    scoreReport: {
      id: `${opts.id}-report`, overallCefr: opts.cefr, isVerified: verified,
      certificateUrl: verified ? `/verify/${opts.id}-report` : null,
      diagnosticReport: {
        productLine: opts.product, overallTheta: opts.theta, overallSem: opts.sem, overallCefr: opts.cefr,
        scoringComplete: verified, certificateIssuedAt: verified ? completedAt.toISOString() : undefined,
        skillProfiles: opts.skills,
      },
    },
    responses,
  };
}

export const SAMPLE_ADULT = session({
  id: 'sample-general', name: 'Deniz Yılmaz', product: 'General English', cefr: 'B2', theta: 0.62, sem: 0.24,
  minutes: 54, org: 'Örnek Dil Okulu',
  skills: {
    LISTENING: { theta: 0.35, sem: 0.33, cefrLevel: 'B1' }, READING: { theta: 0.95, sem: 0.3, cefrLevel: 'B2' },
    GRAMMAR: { theta: 0.88, sem: 0.29, cefrLevel: 'B2' }, VOCABULARY: { theta: 0.71, sem: 0.31, cefrLevel: 'B2' },
    WRITING: { theta: 0.42, sem: 0.47, cefrLevel: 'B1' }, SPEAKING: { theta: 0.58, sem: 0.52, cefrLevel: 'B2' },
  },
  rubric: {
    WRITING: [{ taskRelevance: 7, coherence: 6, grammar: 6, vocabulary: 7 }, { taskRelevance: 7.5, coherence: 6.5, grammar: 5.5, vocabulary: 6.5 }],
    SPEAKING: [{ taskRelevance: 8, coherence: 7, grammar: 6, vocabulary: 7, fluency: 6.5 }, { taskRelevance: 7, coherence: 7, grammar: 6.5, vocabulary: 7, fluency: 7 }],
  },
});

export const SAMPLE_JUNIOR = session({
  id: 'sample-junior', name: 'Elif Kaya', product: 'Junior Suite (11-14)', cefr: 'B1', theta: 0.05, sem: 0.27,
  minutes: 66, org: 'Örnek Ortaokulu',
  skills: {
    LISTENING: { theta: 0.12, sem: 0.34, cefrLevel: 'B1' }, READING: { theta: 0.3, sem: 0.33, cefrLevel: 'B1' },
    GRAMMAR: { theta: 0.02, sem: 0.3, cefrLevel: 'B1' }, VOCABULARY: { theta: 0.1, sem: 0.31, cefrLevel: 'B1' },
    WRITING: { theta: -0.55, sem: 0.5, cefrLevel: 'A2' }, SPEAKING: { theta: -0.7, sem: 0.55, cefrLevel: 'A2' },
  },
  rubric: {
    WRITING: [{ taskRelevance: 6, coherence: 5, grammar: 4.5, vocabulary: 5 }, { taskRelevance: 6.5, coherence: 5.5, grammar: 5, vocabulary: 5.5 }],
    SPEAKING: [{ taskRelevance: 6, coherence: 5, grammar: 4.5, vocabulary: 5, fluency: 4.5 }, { taskRelevance: 5.5, coherence: 5, grammar: 5, vocabulary: 5, fluency: 5 }],
  },
});

export const SAMPLE_PRIMARY = session({
  id: 'sample-primary', name: 'Can Öztürk', product: 'Primary (7-10)', cefr: 'A1', theta: -1.9, sem: 0.31,
  minutes: 38, org: 'Örnek İlkokulu',
  skills: {
    LISTENING: { theta: -1.6, sem: 0.36, cefrLevel: 'A1' }, READING: { theta: -2.0, sem: 0.38, cefrLevel: 'A1' },
    GRAMMAR: { theta: -2.3, sem: 0.37, cefrLevel: 'A1' }, VOCABULARY: { theta: -1.5, sem: 0.35, cefrLevel: 'A1' },
    WRITING: { theta: -2.9, sem: 0.6, cefrLevel: 'PRE_A1' }, SPEAKING: { theta: -2.2, sem: 0.58, cefrLevel: 'A1' },
  },
  rubric: {
    WRITING: [{ taskRelevance: 4, coherence: 3, grammar: 3, vocabulary: 3.5 }, { taskRelevance: 4.5, coherence: 3.5, grammar: 3, vocabulary: 4 }],
    SPEAKING: [{ taskRelevance: 5, coherence: 4, grammar: 3.5, vocabulary: 4, fluency: 3.5 }, { taskRelevance: 5, coherence: 4.5, grammar: 4, vocabulary: 4.5, fluency: 4 }],
  },
});

export const SAMPLE_PROVISIONAL = { ...SAMPLE_ADULT, id: 'sample-provisional', scoreReport: { ...(SAMPLE_ADULT.scoreReport as any), isVerified: false, certificateUrl: null } };

export const SAMPLES = { adult: SAMPLE_ADULT, junior: SAMPLE_JUNIOR, primary: SAMPLE_PRIMARY, provisional: SAMPLE_PROVISIONAL } as const;
