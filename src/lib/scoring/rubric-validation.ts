/** Structural admission only; descriptor validity still requires expert review. */
export const RUBRIC_VALIDATION_VERSION = '2026-10-14.2';
export type RubricIssue = 'RUBRIC_MISSING' | 'RUBRIC_INVALID' | 'RUBRIC_TOO_LARGE' | 'RUBRIC_INVALID_WEIGHT';
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const meaningful = (value: unknown): boolean => typeof value === 'string' ? value.trim().length > 0 :
  record(value) && ['descriptor', 'description', 'name'].some(key => typeof value[key] === 'string' && (value[key] as string).trim().length > 0);
export function rubricReviewReasons(rubric: unknown): RubricIssue[] {
  if (rubric == null || (typeof rubric === 'string' && !rubric.trim())) return ['RUBRIC_MISSING'];
  let serialized: string;
  try { serialized = JSON.stringify(rubric); } catch { return ['RUBRIC_INVALID']; }
  if (!serialized) return ['RUBRIC_INVALID'];
  if ((typeof rubric === 'string' ? rubric.length : serialized.length) > 8000) return ['RUBRIC_TOO_LARGE'];
  if (typeof rubric === 'string') return [];
  if (!record(rubric)) return ['RUBRIC_INVALID'];
  const criteria = Array.isArray(rubric.criteria) ? rubric.criteria : Object.entries(rubric)
    .filter(([key]) => !['scale', 'minWords', 'maxWords', 'version', 'weights'].includes(key)).map(([,value]) => value);
  if (!criteria.length || !criteria.every(meaningful)) return ['RUBRIC_INVALID'];
  if (record(rubric.weights)) {
    const names = Array.isArray(rubric.criteria) ? criteria.map(criterion => typeof criterion === 'string' ? criterion : record(criterion) ? criterion.name : undefined) :
      Object.keys(rubric).filter(key => !['scale', 'minWords', 'maxWords', 'version', 'weights'].includes(key));
    if (Object.keys(rubric.weights).some(key => !names.includes(key))) return ['RUBRIC_INVALID_WEIGHT'];
  }
  if (criteria.some(criterion => record(criterion) && 'maxScore' in criterion &&
    (typeof criterion.maxScore !== 'number' || !Number.isFinite(criterion.maxScore) || criterion.maxScore <= 0))) return ['RUBRIC_INVALID'];
  const weights = record(rubric.weights) ? Object.values(rubric.weights) :
    criteria.filter(record).filter(criterion => 'weight' in criterion).map(criterion => criterion.weight);
  if (weights.length && (weights.some(weight => typeof weight !== 'number' || !Number.isFinite(weight) || weight < 0) ||
    (weights as number[]).reduce((sum, weight) => sum + weight, 0) <= 0 || weights.length !== criteria.length)) return ['RUBRIC_INVALID_WEIGHT'];
  if ('weights' in rubric && !record(rubric.weights)) return ['RUBRIC_INVALID_WEIGHT'];
  return [];
}

/** Prefer explicit authored criterion arrays; do not mask malformed detailed rubrics with a generic note. */
export function resolveTaskRubric(content: Record<string, unknown>): unknown {
  if (content.scoringRubric !== undefined && content.scoringRubric !== null) {
    return Array.isArray(content.scoringRubric) ? {criteria:content.scoringRubric} : content.scoringRubric;
  }
  return content.rubric;
}
