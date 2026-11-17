/**
 * View model for the printable A4 score report and certificate.
 *
 * Built on top of buildAssessmentReport (the same model the PDF, shared report
 * and score-report API use), so status, provisional and certificate rules stay
 * in one place. Every field here is either read from the session/score report
 * or derived deterministically from it; nothing is estimated for display.
 */
import { CEFR_META, CEFR_THETA_THRESHOLDS, thetaToBeps, type CefrLevel } from '../cefr/cefr-framework.js';
import { getProfile, resolveProfileName } from '../product-lines/profiles.js';
import { shouldExcludeResponseFromAbility } from '../scoring/score-evidence.js';
import { buildAssessmentReport, type AssessmentReport, type ReportSession, type ReportSkill } from './assessment-report-model.js';
import { audienceForProfile, externalEquivalences, type EquivalenceAudience, type EquivalenceBlock } from './external-equivalences.js';
import { canDo, GROUP_LABEL, LEVEL_ORDER, LEVEL_SUMMARY, levelLabel, nextTarget, PRACTICE_ACTION, RUBRIC_LABEL, SKILL_LABEL, type ReportLocale } from './report-copy.js';

export interface ReportDocumentSession extends ReportSession {
  startedAt?: Date | string | null;
  organization?: { name?: string | null; branding?: unknown } | null;
  responses?: Array<NonNullable<ReportSession['responses']>[number] & { item?: { skill?: string } | null }>;
}

export interface ReportDocumentOptions {
  locale?: ReportLocale;
  baseUrl: string;
  now?: Date;
  /** Design previews only: watermark the documents as fictional. */
  sample?: boolean;
}

const RUBRIC_KEYS = ['taskRelevance', 'coherence', 'grammar', 'vocabulary', 'fluency'] as const;
const record = (v: unknown): Record<string, any> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, any> : {};
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const toDate = (v: unknown) => {
  if (!(typeof v === 'string' || v instanceof Date)) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
};

/** CEFR boundaries on the 0–1000 BEPS axis, for drawing the level ladder. */
export function cefrLadder() {
  const cuts = LEVEL_ORDER.slice(0, -1).map(l => thetaToBeps(CEFR_THETA_THRESHOLDS[l]));
  return LEVEL_ORDER.map((level, i) => ({ level, label: levelLabel(level), from: i === 0 ? 0 : cuts[i - 1], to: i === cuts.length ? 1000 : cuts[i] }));
}

function rubricProfile(responses: NonNullable<ReportDocumentSession['responses']>, skill: 'WRITING' | 'SPEAKING', locale: ReportLocale) {
  const scored = responses.filter(r => r.item?.skill?.toUpperCase() === skill && !shouldExcludeResponseFromAbility(r));
  const sums: Record<string, { total: number; n: number }> = {};
  let tasks = 0;
  for (const r of scored) {
    const rubric = record(record(r.metadata).rubricScores);
    let used = false;
    for (const key of RUBRIC_KEYS) {
      const v = rubric[key];
      if (!finite(v) || v < 0 || v > 10) continue;
      (sums[key] ??= { total: 0, n: 0 });
      sums[key].total += v; sums[key].n += 1; used = true;
    }
    if (used) tasks += 1;
  }
  const dimensions = RUBRIC_KEYS.filter(k => sums[k]).map(key => ({
    key, label: RUBRIC_LABEL[key][locale], mean: Math.round((sums[key].total / sums[key].n) * 10) / 10, max: 10,
  }));
  return dimensions.length ? { skill, tasks, dimensions } : null;
}

export function buildReportDocument(session: ReportDocumentSession, options: ReportDocumentOptions) {
  const locale = options.locale ?? 'en';
  const now = options.now ?? new Date();
  const report: AssessmentReport = buildAssessmentReport(session, options.baseUrl, now);
  const sr = record(session.scoreReport);
  const diagnostic = record(sr.diagnosticReport);
  const meta = record(session.metadata);
  const productKey = typeof diagnostic.productLine === 'string' ? diagnostic.productLine : typeof meta.productLine === 'string' ? meta.productLine : null;
  const profile = resolveProfileName(productKey) ? getProfile(productKey) : null;
  const audience: EquivalenceAudience = audienceForProfile(profile);
  const responses = session.responses ?? [];

  const startedAt = toDate(session.startedAt);
  const durationMinutes = startedAt && report.completedAt && report.completedAt > startedAt
    ? Math.round((report.completedAt.getTime() - startedAt.getTime()) / 60000) : null;

  const inProfile = (skill: ReportSkill) => !profile || profile.sectionOrder.map(s => String(s).toUpperCase()).includes(skill);
  const DISPLAY_ORDER: ReportSkill[] = ['LISTENING', 'READING', 'GRAMMAR', 'VOCABULARY', 'WRITING', 'SPEAKING'];
  const ordered = [...report.skills].sort((a, b) => DISPLAY_ORDER.indexOf(a.skill) - DISPLAY_ORDER.indexOf(b.skill));
  const skills = ordered.filter(s => inProfile(s.skill)).map(s => {
    const beps = s.theta !== null ? thetaToBeps(s.theta) : null;
    const band = s.theta !== null && s.sem !== null ? { lower: thetaToBeps(s.theta - 1.96 * s.sem), upper: thetaToBeps(s.theta + 1.96 * s.sem) } : null;
    const target = s.cefr ? nextTarget(s.skill, s.cefr, locale) : null;
    return {
      skill: s.skill, label: SKILL_LABEL[s.skill][locale], cefr: s.cefr, cefrLabel: s.cefr ? levelLabel(s.cefr) : null,
      state: s.state, beps, band, sem: s.sem, items: s.count,
      canDo: s.cefr ? canDo(s.skill, s.cefr, locale) : null,
      nextLevel: target?.level ? levelLabel(target.level) : null, nextText: target?.text ?? null,
    };
  });

  const reported = skills.filter(s => s.cefr);
  const rank = (l: CefrLevel | null) => l ? LEVEL_ORDER.indexOf(l) : -1;
  const byLevel = [...reported].sort((a, b) => rank(b.cefr) - rank(a.cefr) || (b.beps ?? 0) - (a.beps ?? 0));
  const distinct = reported.length > 1 && rank(byLevel[0].cefr) !== rank(byLevel[byLevel.length - 1].cefr);
  const strengths = distinct ? byLevel.filter(s => rank(s.cefr) === rank(byLevel[0].cefr)).slice(0, 2) : [];
  const nextSteps = [...byLevel].reverse().slice(0, distinct ? 2 : Math.min(2, byLevel.length))
    .map(s => ({ skill: s.skill, label: s.label, cefrLabel: s.cefrLabel, action: PRACTICE_ACTION[s.skill][locale] }));

  const rubrics = [rubricProfile(responses, 'WRITING', locale), rubricProfile(responses, 'SPEAKING', locale)].filter(Boolean) as NonNullable<ReturnType<typeof rubricProfile>>[];
  const final = !report.provisional && report.status === 'Completed';
  const equivalences: EquivalenceBlock | null = final ? externalEquivalences(report.cefr, audience, locale) : null;
  const org = record(session.organization);
  const branding = record(org.branding);
  const ageRange = profile?.ageRange ?? null;

  return {
    locale, audience, sample: options.sample === true, generatedAt: now,
    issuer: {
      name: typeof org.name === 'string' && org.name.trim() ? org.name.trim() : 'b4skills',
      logoUrl: typeof branding.logoUrl === 'string' && /^https?:\/\/|^\//.test(branding.logoUrl) ? branding.logoUrl : null,
    },
    candidateName: report.candidateName,
    test: {
      product: report.productLine,
      profileKey: profile?.name ?? null,
      ageRange: ageRange && ageRange[1] < 99 ? `${ageRange[0]}–${ageRange[1]}` : ageRange ? `${ageRange[0]}+` : null,
      levelRange: profile ? `${levelLabel(profile.cefrRange[0] as CefrLevel)}–${levelLabel(profile.cefrRange[1] as CefrLevel)}` : null,
      method: profile?.mst ? 'mst' as const : 'cat' as const,
      sections: (profile?.sectionOrder ?? []).map(s => String(s).toUpperCase()).filter((s): s is ReportSkill => Object.hasOwn(SKILL_LABEL, s)).map(s => SKILL_LABEL[s][locale]),
      startedAt, completedAt: report.completedAt, durationMinutes,
      scoredTasks: responses.length ? responses.filter(r => !r.isPretest && !shouldExcludeResponseFromAbility(r)).length : null,
    },
    overall: {
      cefr: report.cefr, cefrLabel: levelLabel(report.cefr),
      group: report.cefr ? GROUP_LABEL[CEFR_META[report.cefr].group][locale] : null,
      summary: report.cefr ? LEVEL_SUMMARY[report.cefr][locale] : null,
      beps: report.beps, theta: report.theta, sem: report.sem,
      interval: report.interval ? { ...report.interval, cefrLowerLabel: levelLabel(report.interval.cefrLower), cefrUpperLabel: levelLabel(report.interval.cefrUpper) } : null,
      status: report.status, provisional: report.provisional, final,
    },
    skills, strengths, nextSteps, rubrics, equivalences,
    ladder: cefrLadder(),
    verification: {
      certificateId: report.certificateId, verificationUrl: report.verificationUrl,
      reportId: report.reportId, sessionId: report.sessionId, validUntil: report.validUntil,
    },
  };
}

export type ReportDocument = ReturnType<typeof buildReportDocument>;

/** A certificate is only issued for a final, verified result with a certificate id. */
export function certificateAvailable(doc: ReportDocument): boolean {
  return doc.overall.final && !!doc.verification.certificateId && !!doc.overall.cefr;
}
