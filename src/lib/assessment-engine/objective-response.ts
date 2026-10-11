import type { Item } from './types.js';
import { shuffleMcqOptions } from './mcq-options.js';
import { scoreFreemiumResponse } from '../product-lines/freemium-response-scoring.js';
import { normalizeBlankScaffold, scoreBlankResponse } from './blank-response.js';
import { scoreStructuredResponse } from './structured-response.js';

export class UnscorableObjectiveError extends Error {}

/** The same objective scorer is used by live delivery and whole-bank audits. */
export function scoreObjectiveResponse(item: Item, sessionId: string, value: unknown, shuffleOptions = true): number {
  const metadata = item.metadata ?? {};
  if (item.type === 'DRAG_DROP') return scoreStructuredResponse(metadata, value);
  if (item.type === 'FILL_IN_BLANKS' && Array.isArray(metadata.blanks) && metadata.blanks.length)
    return scoreBlankResponse(metadata.blanks, value);
  const shuffle = shuffleOptions ? shuffleMcqOptions(metadata.options, metadata.correctAnswer, sessionId, item.id) : null;
  const rawOptions = shuffle?.shuffledOptions ?? metadata.options;
  const options = Array.isArray(rawOptions) ? rawOptions.map(option => typeof option === 'string' ? option : String(option.text)) : undefined;
  const flaggedIndex = Array.isArray(rawOptions) ? rawOptions.findIndex(option => typeof option === 'object' && option?.isCorrect === true) : -1;
  // Legacy listening tasks store ordered keys as "short|brown|shorts".
  // A pipe is an alternatives separator only in a single-gap task.
  if (item.type === 'FILL_IN_BLANKS' && !options?.length) {
    const scaffold = metadata.scaffold || [metadata.prompt, metadata.passage].find(value => typeof value === 'string' && value.includes('___')) || '';
    const gapCount = (normalizeBlankScaffold(String(scaffold)).match(/___/g) ?? []).length;
    if (gapCount > 1 && typeof metadata.correctAnswer === 'string') {
      const keys = metadata.correctAnswer.split('|');
      if (keys.length !== gapCount) throw new UnscorableObjectiveError('Blank key count does not match the rendered task');
      return scoreBlankResponse(keys.map(key => ({ acceptableAnswers: [key] })), value);
    }
  }
  let normalizedValue = options?.length && typeof value === 'string' && /^[A-Z]$/i.test(value.trim())
    ? value.trim().toUpperCase().charCodeAt(0) - 65 : value;
  // A FIB dropdown submits an option ID; its plain-input fallback submits text.
  if (options?.length && item.type === 'FILL_IN_BLANKS' && typeof normalizedValue === 'string')
    normalizedValue = options.findIndex(option => option.trim().toLowerCase() === normalizedValue.toString().trim().toLowerCase());
  const result = scoreFreemiumResponse({ skill: String(item.skill), type: options?.length ? 'MULTIPLE_CHOICE' : item.type ?? '', content: { ...metadata,
    scaffold: options?.length ? undefined : metadata.scaffold, options, correctIndex: shuffle ? undefined : metadata.correctIndex ?? (flaggedIndex >= 0 ? flaggedIndex : undefined),
    correctOption: shuffle ? undefined : metadata.correctOption, correctAnswer: shuffle?.newCorrectAnswer ?? metadata.correctAnswer,
  } }, normalizedValue);
  if (result === null) throw new UnscorableObjectiveError('Item has no supported answer key or response format');
  return result ? 1 : 0;
}
