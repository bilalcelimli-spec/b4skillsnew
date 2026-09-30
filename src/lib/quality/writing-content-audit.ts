import type { AuditFinding } from './item-evidence-audit.js';
const object = (v: unknown): Record<string, any> => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
export function writingWordRange(value: unknown) {
  const c = object(value), range = object(c.wordRange);
  return { min: range.min ?? c.minWords ?? 50, max: range.max ?? c.maxWords ?? null,
    documented: range.min !== undefined || range.max !== undefined || c.minWords !== undefined || c.maxWords !== undefined };
}
export function declaredWritingRanges(prompt: string): { min: number; max: number; text: string }[] {
  const matches = [...prompt.matchAll(/\b(?:between\s+)?(\d{1,4})\s*(?:[-–—]|and)\s*(\d{1,4})\s+words\b/gi)];
  return matches.map(m => ({ min: Number(m[1]), max: Number(m[2]), text: m[0] }));
}
export function writingContentFindings(value: unknown): AuditFinding[] {
  const c = object(value), effective = writingWordRange(c), findings: AuditFinding[] = [];
  const prompt = String(c.prompt || c.question || '');
  const add = (rule: string, severity: AuditFinding['severity'], evidence: string, action: string) => findings.push({ rule, severity, evidence, action });
  if (!Number.isInteger(effective.min) || effective.min < 0 || (effective.max !== null && (!Number.isInteger(effective.max) || effective.max < effective.min)))
    add('WRITING_RANGE_INVALID', 'BLOCKER', 'The rendered word range is invalid.', 'Repair the response bounds before delivery.');
  const ranges = declaredWritingRanges(prompt);
  if (ranges.some(r => r.min !== effective.min || r.max !== effective.max))
    add('WRITING_PROMPT_RANGE_CONFLICT', 'REVIEW', `Prompt ranges=${ranges.map(r => `${r.min}-${r.max}`).join(', ')}; rendered=${effective.min}-${effective.max}.`, 'Align candidate instructions, editor limits and scoring expectations.');
  if ((c.minWords !== undefined && c.minWords !== effective.min) || (c.maxWords !== undefined && c.maxWords !== effective.max))
    add('WRITING_RANGE_ALIAS_CONFLICT', 'REVIEW', 'Legacy minWords/maxWords disagree with the rendered wordRange.', 'Normalize legacy aliases without changing the effective delivery limits.');
  for (const key of ['rubric', 'scoringRubric']) {
    const rubric = object(c[key]);
    if ((rubric.minWords !== undefined && rubric.minWords !== effective.min) || (rubric.maxWords !== undefined && rubric.maxWords !== effective.max))
      add('WRITING_RUBRIC_RANGE_CONFLICT', 'REVIEW', `${key} numerical word bounds disagree with the editor.`, 'Align the rubric bounds with the chosen response specification.');
  }
  const summaryOfExternalSource = /\b(?:summari[sz]e|summary)\b/i.test(prompt)
    && /\b(?:read (?:an? |the )?(?:article|essay|text|report)|summary of (?:the|this) (?:article|essay|text|report)|summari[sz]e (?:the main (?:arguments|points) of )?(?:the|this) (?:article|essay|text)|author['’]s|essay above)\b/i.test(prompt);
  const supplied = [c.passage, c.input, c.stimulus].some(v => typeof v === 'string' && v.trim())
    || /\bkey information\b[\s\S]*\b(?:developer|claims|concerns)\b/i.test(prompt);
  if (summaryOfExternalSource && !supplied)
    add('WRITING_SOURCE_MISSING', 'BLOCKER', 'Task requires summarising an external source, but no rendered passage/input/stimulus or explicit inline source data is present.', 'Recover and verify the original source; exclude the task from delivery until then.');
  return findings;
}

/** Pilot-only range correction. Active task specifications need editorial adjudication. */
export function writingCorrectionPlan(status: string, value: unknown) {
  const c = object(value);
  const quarantine = writingContentFindings(c).some(f => f.rule === 'WRITING_SOURCE_MISSING');
  let next = c;
  let rangeRevised = false;
  const ranges = declaredWritingRanges(String(c.prompt || c.question || ''));
  const unique = [...new Map(ranges.map(r => [`${r.min}-${r.max}`, r])).values()];
  if (!quarantine && status === 'PRETEST' && unique.length === 1 && unique[0].min > 0 && unique[0].max >= unique[0].min) {
    const actual = writingWordRange(c), desired = unique[0];
    if (actual.min !== desired.min || actual.max !== desired.max) {
      next = { ...c, wordRange: { ...object(c.wordRange), min: desired.min, max: desired.max } };
      rangeRevised = true;
    }
  }
  next = normalizeWritingAliases(next) || next;
  return { next, quarantine, rangeRevised, changed: quarantine || JSON.stringify(next) !== JSON.stringify(c) };
}

/** Mechanical alias alignment only. Never invent a source or silently rewrite task instructions. */
export function normalizeWritingAliases(value: unknown): Record<string, any> | null {
  const c = object(value), range = writingWordRange(c);
  if (!range.documented || !Number.isInteger(range.min) || range.min < 0 || (range.max !== null && (!Number.isInteger(range.max) || range.max < range.min))) return null;
  const next = { ...c };
  if (c.minWords !== undefined) next.minWords = range.min;
  if (c.maxWords !== undefined) next.maxWords = range.max;
  for (const key of ['rubric', 'scoringRubric']) {
    const rubric = object(c[key]);
    if (Object.keys(rubric).length) {
      next[key] = { ...rubric };
      if (rubric.minWords !== undefined) next[key].minWords = range.min;
      if (rubric.maxWords !== undefined) next[key].maxWords = range.max;
    }
  }
  return JSON.stringify(next) === JSON.stringify(c) ? null : next;
}
