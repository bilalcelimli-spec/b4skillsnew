/** Options arrive as legacy text or structured item-bank records. */
export type DisplayOption = string | {
  id?: string;
  text: string;
  isCorrect?: boolean;
  rationale?: string;
  /** Picture option (young-learner "choose the right picture" tasks). text may be empty. */
  imageUrl?: string;
  /** Screen-reader description of the picture. */
  imageAlt?: string;
};

export function optionImage(option: DisplayOption): string | undefined {
  return typeof option === 'string' ? undefined : option.imageUrl || undefined;
}

export function optionText(option: DisplayOption): string {
  return typeof option === 'string' ? option : option.text;
}

/** Review views accept answer IDs, text, letters, and legacy zero-based indexes. */
export function matchesOption(answer: string | number | null | undefined, option: DisplayOption, index: number): boolean {
  if (answer === null || answer === undefined || answer === '') return false;
  const text = optionText(option);
  const id = typeof option === 'string' ? undefined : option.id;
  return answer === text || (id !== undefined && answer === id) ||
    answer === String.fromCharCode(65 + index) || Number(answer) === index;
}
