const ANSWER_KEY_FIELDS = new Set([
  "answer",
  "answerkey",
  "acceptableanswers",
  "correctanswer",
  "correctanswers",
  "correctindex",
  "correctmapping",
  "correctorder",
  "correctsequence",
  "correctoption",
  "correctoptionindex",
  "expectedanswer",
  "iscorrect",
  "modelanswer",
  "rubric",
  "scoringguide",
  "solution",
]);

/** Remove answer and scoring secrets recursively from JSON sent to candidates. */
export function stripAnswerKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripAnswerKeys);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !ANSWER_KEY_FIELDS.has(key.toLowerCase()))
      .map(([key, nested]) => [key, stripAnswerKeys(nested)]),
  );
}
