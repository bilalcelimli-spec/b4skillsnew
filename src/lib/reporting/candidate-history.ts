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
