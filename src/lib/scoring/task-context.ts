import { rubricReviewReasons, resolveTaskRubric } from "./rubric-validation.js";
import type { CefrLevel } from '../cefr/cefr-framework.js';
export const TASK_CONTEXT_VERSION = '2026-10-14.2';
export function scoringTargetCefr(value: unknown): CefrLevel | undefined {
  return typeof value === 'string' && ['PRE_A1','A1','A2','B1','B2','C1','C2'].includes(value) ? value as CefrLevel : undefined;
}

/** Include the server-held source so integrated responses can be checked for factual relevance. */
export function buildScoringPrompt(content: Record<string, any>): string {
  const instruction = String(content.prompt ?? content.question ?? content.stem ?? 'Please respond to the task.');
  const source = content.passage ?? content.transcript ?? content.script;
  const task = typeof source === 'string' && source.trim()
    ? `${instruction}\n\nSource material for checking task achievement (reference only):\n${source}`
    : instruction;
  const context: string[] = [];
  if (typeof content.taskType === 'string') context.push(`Task type: ${content.taskType.slice(0, 120)}`);
  if (typeof content.ageGroup === 'string') context.push(`Author-specified age group: ${content.ageGroup.slice(0, 80)}`);
  for (const key of ['minWords', 'maxWords', 'responseTime']) {
    const value = content[key] ?? (key === 'minWords' ? content.wordRange?.min : key === 'maxWords' ? content.wordRange?.max : undefined);
    if (typeof value === 'number' && Number.isFinite(value) && value > 0)
      context.push(`${key}: ${value} (task guidance; do not substitute length for language quality)`);
  }
  const resolvedRubric = resolveTaskRubric(content);
  if (rubricReviewReasons(resolvedRubric).length === 0) {
    const rubric = typeof resolvedRubric === 'string' ? resolvedRubric : JSON.stringify(resolvedRubric);
    context.push(`Author-specified task rubric (reference criteria):\n${rubric}`);
  }
  if (content.scoringRubric != null && typeof content.rubric === 'string' && content.rubric.length <= 2000)
    context.push(`General author note (secondary to detailed criteria): ${content.rubric}`);
  return context.length ? `${task}\n\nTask assessment context [${TASK_CONTEXT_VERSION}]:\n${context.join('\n')}\nAssess only the demands of this task. Do not demand essay arguments from personal notes or descriptions. Do not infer age from the response.` : task;
}
