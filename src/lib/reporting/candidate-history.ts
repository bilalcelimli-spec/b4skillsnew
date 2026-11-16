/** Candidate history uses persisted scores in the 0–100 scale. */
export function hasFinalResult(session: any): boolean {
  return session?.status === 'COMPLETED' && session.scoreReport?.isVerified === true &&
    session.scoreReport.diagnosticReport?.scoringComplete === true &&
    session.scoreReport.diagnosticReport?.securityFlag !== true && session.metadata?.securityFlag !== true;
}
export function historyStatus(session: any): string {
  if (session.metadata?.sessionType==='FIXED_FORM' && session.metadata.fixedForm?.report && session.status==='COMPLETED')
    return session.metadata.fixedForm.report.keyConfirmed ? 'Completed' : 'Provisional Result';
  if (hasFinalResult(session)) return 'Completed';
  if (session.status === 'FLAGGED' || session.metadata?.securityFlag === true || session.scoreReport?.diagnosticReport?.securityFlag === true) return 'Under Review';
  if (['COMPLETED', 'SCORING'].includes(session.status)) return 'Scoring Pending';
  return session.status === 'IN_PROGRESS' ? 'In Progress' : session.status;
}
export function historySkills(session: any) {
  if (!hasFinalResult(session)) return [];
  const report = session.scoreReport;
  return ['Grammar', 'Vocabulary', 'Reading', 'Listening', 'Writing', 'Speaking'].flatMap(label => {
    const score = report[label.toLowerCase() + 'Score'];
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100) return [];
    const profile = report.diagnosticReport?.skillProfiles?.[label.toUpperCase()];
    return [{ label, value: Math.round(score), level: profile?.cefr ?? profile?.cefrLevel ?? '—' }];
  });
}
/** Headline result for a history row: raw score for fixed forms, CEFR when final, otherwise null. */
export function historyResultLabel(session: any): string | null {
  const fixed = session?.metadata?.fixedForm?.report;
  if (session?.metadata?.sessionType === 'FIXED_FORM' && fixed && typeof fixed.correct === 'number')
    return `${fixed.correct}/${typeof fixed.total === 'number' ? fixed.total : 96}`;
  if (hasFinalResult(session) && typeof session.scoreReport.overallCefr === 'string')
    return session.scoreReport.overallCefr.replace('_', ' ');
  return null;
}
/** Sessions that have something to show in the results list. */
export function isReportableSession(session: any): boolean {
  return ['COMPLETED', 'SCORING', 'FLAGGED'].includes(session?.status);
}
