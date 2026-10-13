import { AppError } from '../errors/app-error';
import { buildAssessmentReport, REPORT_SKILLS, type ReportSession } from './assessment-report-model';
import { shouldExcludeResponseFromAbility } from '../scoring/score-evidence';

/** Revalidate the current result on every public read; a token is not certification. */
export function sharedReportSummary(session: ReportSession, baseUrl: string, now = new Date()) {
  const model = buildAssessmentReport(session, baseUrl, now);
  if (model.status === 'Expired') throw new AppError(410, 'REPORT_EXPIRED', 'This result has expired.');
  if (model.status !== 'Completed' || !model.cefr) throw AppError.conflict('This result is not available for public sharing.');
  const stored = session.scoreReport ?? {};
  const skills = Object.fromEntries(REPORT_SKILLS.map(skill => {
    const score = stored[skill.toLowerCase()+'Score'];
    const measured = session.responses?.some(response => response.item?.skill === skill && !shouldExcludeResponseFromAbility(response));
    return [skill.toLowerCase(), measured && typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 100 ? score : null];
  }));
  const score = stored.overallScore;
  return {candidateName:model.candidateName,productLine:model.productLine,cefr:model.cefr,
    score:typeof score === 'number' && Number.isFinite(score) && score >= 0 && score <= 100 ? score : null,
    scoreScale:'0–100 platform scale',skills,completedAt:model.completedAt!.toISOString(),
    validUntil:model.validUntil?.toISOString() ?? null,status:model.status};
}
