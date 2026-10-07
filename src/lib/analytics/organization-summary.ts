const SKILLS = ['reading', 'listening', 'writing', 'speaking', 'grammar', 'vocabulary'] as const;
export function summarizeOrganizationSkills(reports: Array<Record<string, number | null>>) {
  return SKILLS.map(skill => {
    const scores = reports.map(r => r[`${skill}Score`]).filter((v): v is number =>
      typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100);
    const average = scores.length ? Math.round(scores.reduce((sum, v) => sum + v, 0) / scores.length) : null;
    const label = skill[0].toUpperCase() + skill.slice(1);
    return { skill: label, avg: average, count: scores.length, subject: label, A: average };
  });
}
