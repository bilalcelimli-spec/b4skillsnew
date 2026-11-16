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
  // Authoring evidence that points at the key (audit 2026-11-16: 1,943 of 2,495
  // live items sent per-option rationales such as "This word does not exist").
  "rationale",
  "keyrationale",
  "distractorrationale",
  "distractortype",
  "distractorlogic",
  "commonsenseoption",
  "targetword",
  "explanation",
  "sampleanswer",
  "qualitynotes",
  "reviewfeedback",
  // Listening source text: the candidate hears it, never reads it (ItemRenderer drops it too).
  "ttsscript",
  "transcript",
  "audioscript",
  "ttsnotes",
  // Review / editorial history can quote previous options and their rationales.
  "editorialrevision",
  "editorialcorrections",
  "cefrqualityreview",
  "contentaudit",
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
