import { shouldExcludeResponseFromAbility, hasCompleteScoringEvidence, scoringRequirements } from "../scoring/score-evidence.js";
import { CEFR_META, thetaToBeps, thetaToCefr, type CefrLevel } from '../cefr/cefr-framework.js';

export const REPORT_SKILLS = ['READING', 'LISTENING', 'WRITING', 'SPEAKING', 'GRAMMAR', 'VOCABULARY'] as const;
export type ReportSkill = typeof REPORT_SKILLS[number];
type Json = Record<string, any>;
export interface ReportSession {
  id: string;
  status: string;
  candidate?: { name?: string | null; email?: string | null } | null;
  completedAt?: Date | string | null;
  validUntil?: Date | string | null;
  theta?: number | null;
  currentTheta?: number | null;
  sem?: number | null;
  metadata?: unknown;
  scoreReport?: Json | null;
  responses?: Array<{ score?: number | null; isPretest?: boolean; metadata?: unknown; item?: { skill?: string } | null }>;
}

const record = (value: unknown): Json => value && typeof value === 'object' && !Array.isArray(value) ? value as Json : {};
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const level = (value: unknown): CefrLevel | null => typeof value === 'string' && Object.hasOwn(CEFR_META, value) ? value as CefrLevel : null;
const date = (value: unknown): Date | null => {
  if (!(typeof value === 'string' || value instanceof Date)) return null;
  const result = new Date(value);
  return Number.isFinite(result.getTime()) ? result : null;
};

export function buildAssessmentReport(session: ReportSession, baseUrl: string, now = new Date()) {
  const sr = record(session.scoreReport);
  const diagnostic = record(sr.diagnosticReport);
  const meta = record(session.metadata);
  const theta = [diagnostic.overallTheta, session.currentTheta, session.theta].find(finite) ?? null;
  const sem = [diagnostic.overallSem, session.sem].find(v => finite(v) && v >= 0) as number | undefined;
  const cefr = level(sr.overallCefr) ?? level(diagnostic.overallCefr) ?? (theta !== null ? thetaToCefr(theta) : null);
  const responses = session.responses ?? [];
  const pending = responses.some(r => {
    const m = record(r.metadata);
    return !r.isPretest && shouldExcludeResponseFromAbility(r);
  }) || (session.responses === undefined && meta.pendingAsyncScoring === true);
  const completedAt = date(session.completedAt);
  const validUntil = date(session.validUntil);
  const expired = session.status === 'EXPIRED' || !!(validUntil && validUntil < now);
  const review = session.status === 'FLAGGED' || diagnostic.securityFlag === true;
  const provisional = pending || diagnostic.scoringComplete !== true || sr.isVerified !== true || (session.responses !== undefined && !hasCompleteScoringEvidence(responses, scoringRequirements(meta))) || !completedAt || !session.scoreReport || !['COMPLETED', 'EXPIRED'].includes(session.status);
  const status = expired ? 'Expired' : review ? 'Under review' : provisional ? 'Provisional' : 'Completed';
  const profiles = Object.fromEntries(Object.entries(record(diagnostic.skillProfiles)).map(([key, value]) => [key.toUpperCase(), record(value)]));
  const skills = REPORT_SKILLS.map(skill => {
    const profile = profiles[skill] ?? {};
    const matching = responses.filter(r => r.item?.skill?.toUpperCase() === skill);
    const skillPending = matching.some(r => {
      const m = record(r.metadata);
      return !r.isPretest && shouldExcludeResponseFromAbility(r);
    });
    const skillTheta = finite(profile.theta) ? profile.theta : null;
    // Never substitute the overall ability for an unmeasured skill.
    const skillLevel = level(profile.cefrLevel) ?? level(profile.cefr) ?? (skillTheta !== null ? thetaToCefr(skillTheta) : null);
    return {
      skill, theta: skillTheta, cefr: skillPending ? null : skillLevel,
      sem: finite(profile.sem) && profile.sem >= 0 ? profile.sem : null,
      count: session.responses ? matching.filter(r => !r.isPretest).length : null,
      state: skillPending ? 'Scoring pending' : skillLevel ? 'Reported' : matching.length ? 'Result unavailable' : 'Not assessed',
    };
  });
  const certificateId = sr.isVerified === true && typeof sr.certificateUrl === 'string' && !!date(diagnostic.certificateIssuedAt) && typeof sr.id === 'string' && !provisional && !review && !expired ? sr.id : null;
  return {
    sessionId: session.id, reportId: typeof sr.id === 'string' ? sr.id : null,
    candidateName: session.candidate?.name?.trim() || 'Candidate',
    candidateEmail: session.candidate?.email || null,
    productLine: typeof diagnostic.productLine === 'string' ? diagnostic.productLine : typeof meta.productLine === 'string' ? meta.productLine : 'English Assessment',
    completedAt, validUntil, generatedAt: now, status, provisional, cefr, theta,
    sem: sem ?? null, beps: theta === null ? null : thetaToBeps(theta),
    interval: theta !== null && sem !== undefined ? {
      lower: thetaToBeps(theta - 1.96 * sem), upper: thetaToBeps(theta + 1.96 * sem),
      cefrLower: thetaToCefr(theta - 1.96 * sem), cefrUpper: thetaToCefr(theta + 1.96 * sem),
    } : null,
    skills, certificateId,
    verificationUrl: certificateId ? `${baseUrl.replace(/\/$/, '')}/verify/${encodeURIComponent(certificateId)}` : null,
  };
}

export type AssessmentReport = ReturnType<typeof buildAssessmentReport>;

export const PRACTICE: Record<ReportSkill, { meaning: string; action: string }> = {
  READING: { meaning: 'Understanding written texts', action: 'Read a short article. Identify the main point, supporting details and the evidence for each answer.' },
  LISTENING: { meaning: 'Understanding spoken English', action: 'Listen to a short recording without a transcript. Note the main idea and key details, then check with the transcript and replay missed sections.' },
  WRITING: { meaning: 'Communicating in written English', action: 'Write a response with a clear purpose and organised paragraphs. Revise it for task coverage, grammar, vocabulary and cohesion.' },
  SPEAKING: { meaning: 'Communicating in spoken English', action: 'Record a short response to a familiar topic. Listen back for clarity, organisation and pauses, then record an improved version.' },
  GRAMMAR: { meaning: 'Control of grammatical structures', action: 'Keep an error log. Correct each sentence, explain the rule and write two new examples in a meaningful context.' },
  VOCABULARY: { meaning: 'Knowledge and use of words', action: 'Collect useful phrases and collocations from reading or listening. Use them in new sentences and review them with spaced repetition.' },
};

export function practicePriorities(report: AssessmentReport) {
  const order: CefrLevel[] = ['PRE_A1', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  return report.skills.filter(s => s.cefr !== null)
    .sort((a, b) => order.indexOf(a.cefr!) - order.indexOf(b.cefr!))
    .slice(0, 3);
}
