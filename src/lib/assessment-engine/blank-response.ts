/** Numbered and plain markers each represent one gap. */
export const normalizeBlankScaffold = (text: string) => text.replace(/___(?:\[?\d+\]?___)?/g, "___");

export function scoreBlankResponse(blanks: Array<{ acceptableAnswers?: string[] }>, value: unknown): number {
  if (typeof value !== "string") throw new Error("Invalid blank response");
  const answers = value.split("|").map(answer => answer.trim().toLowerCase());
  if (!blanks.length || answers.length !== blanks.length || answers.some(answer => !answer)) throw new Error("Incomplete blank response");
  return blanks.every((blank, index) => blank.acceptableAnswers?.some(answer => answer.trim().toLowerCase() === answers[index])) ? 1 : 0;
}
