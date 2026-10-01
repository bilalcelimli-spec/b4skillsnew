/** A submitted response is not evidence of productive language proficiency. */
export function scoreFreemiumResponse(
  item: { skill: string; type: string; content?: Record<string, any> },
  answer: unknown,
): boolean | null {
  const content = item.content ?? {};
  const isFillIn = item.type === 'FILL_IN_BLANKS' || !!content.scaffold;
  const hasOptions = !isFillIn && Array.isArray(content.options) && content.options.length > 0;
  if (item.type === 'OPEN_RESPONSE' ||
      (['WRITING', 'SPEAKING'].includes(item.skill) && !hasOptions && !isFillIn)) {
    // Productive evaluation is handled separately by the rubric scorer.
    return null;
  }
  if (hasOptions) {
    if (typeof answer !== 'number' || !Number.isInteger(answer) ||
        answer < 0 || answer >= content.options.length) return false;
    const index = content.correctIndex;
    if (Number.isInteger(index) && index >= 0 && index < content.options.length) {
      return answer === index;
    }
  }
  const key = content.correctOption ?? content.correctAnswer;
  if (key === undefined || key === null || key === '') return null;
  if (typeof answer !== 'string' && typeof answer !== 'number') return false;
  const normalize = (value: unknown) => String(value).trim().toLowerCase();
  const input = normalize(answer);
  if (!input) return false;
  if (hasOptions && typeof key === 'number') return answer === key;
  if (hasOptions && typeof key === 'string' && /^[A-Z]$/i.test(key.trim())) {
    return answer === key.trim().toUpperCase().charCodeAt(0) - 65;
  }
  const candidate = hasOptions ? normalize(content.options[answer as number]) : input;
  const alternatives = Array.isArray(key) ? key : String(key).split('|');
  return alternatives.some(value => normalize(value) === candidate);
}

export interface FreemiumSkillBreakdown {
  total: number;
  correct: number;
  scored: number;
  unassessed: number;
  scoreSum?: number;
  scoringKind?: "objective" | "rubric";
  reviewRequired?: number;
}

export function recordFreemiumScore(
  breakdown: Record<string, FreemiumSkillBreakdown>, skill: string, score: boolean | number | null, kind: "objective" | "rubric" = "objective",
): void {
  const entry = breakdown[skill] ??= { total: 0, correct: 0, scored: 0, unassessed: 0 };
  entry.total++;
  entry.scoringKind = kind;
  if (score === null) entry.unassessed++;
  else {
    entry.scored++;
    if (kind === "objective" && Number(score) === 1) entry.correct++;
    entry.scoreSum = (entry.scoreSum ?? 0) + Number(score);
  }
}
