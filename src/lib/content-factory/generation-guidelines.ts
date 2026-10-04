/**
 * Item-writing guidelines injected into the generation prompt.
 *
 * These encode findings from the bank audit: keys were identifiable by style
 * (most hedged / most academic option), distractors carried absolutes, options
 * quoted the passage only for the key, and B2+ items asked for plain recall.
 */

export type CognitiveDemand =
  | "RECOGNITION"
  | "EXPLICIT_DETAIL"
  | "MAIN_IDEA"
  | "SIMPLE_INFERENCE"
  | "INFERENCE"
  | "WRITER_STANCE_OR_IMPLICATION"
  | "SYNTHESIS_OR_EVALUATION";

/** Demands an item may target per CEFR level (receptive skills). */
export const ALLOWED_DEMAND_BY_CEFR: Record<string, readonly CognitiveDemand[]> = {
  PRE_A1: ["RECOGNITION", "EXPLICIT_DETAIL"],
  A1: ["RECOGNITION", "EXPLICIT_DETAIL"],
  A2: ["EXPLICIT_DETAIL", "MAIN_IDEA", "SIMPLE_INFERENCE"],
  B1: ["EXPLICIT_DETAIL", "MAIN_IDEA", "SIMPLE_INFERENCE", "INFERENCE"],
  B2: ["MAIN_IDEA", "SIMPLE_INFERENCE", "INFERENCE", "WRITER_STANCE_OR_IMPLICATION"],
  C1: ["INFERENCE", "WRITER_STANCE_OR_IMPLICATION", "SYNTHESIS_OR_EVALUATION"],
  C2: ["INFERENCE", "WRITER_STANCE_OR_IMPLICATION", "SYNTHESIS_OR_EVALUATION"],
};

const isReceptive = (skill: string) => skill === "READING" || skill === "LISTENING";
const isAdvanced = (cefr: string) => ["B2", "C1", "C2"].includes(cefr);

export function demandGuidance(skill: string, cefr: string): string {
  if (!isReceptive(skill)) return "";
  const allowed = ALLOWED_DEMAND_BY_CEFR[cefr] ?? [];
  const lines = [
    `COGNITIVE DEMAND (required):`,
    `- Target one of: ${allowed.join(", ")}. Return it as "cognitiveDemand".`,
  ];
  if (isAdvanced(cefr)) {
    lines.push(
      `- A ${cefr} question must NOT be answerable by locating one phrase in the text. The key must require combining information, inferring an unstated point, or judging the speaker/writer's stance.`,
      `- The question stem must not repeat a distinctive phrase that also appears in the key.`
    );
  }
  return lines.join("\n");
}

/** Option-writing rules: the main defence against style-identifiable keys. */
export function optionWritingRules(skill: string, cefr: string): string {
  const base = [
    `OPTION WRITING RULES (an item fails review if the key can be picked by style alone):`,
    `- All four options must have the same register, length (within ~20%), grammatical form and level of hedging.`,
    `- Do NOT write the key as the most balanced, nuanced or academic-sounding option. Give 2 distractors the same nuance.`,
    `- Do NOT use absolute words (only, always, never, all, none, entirely, exclusively, completely, impossible, every) in distractors unless the key also contains one.`,
    `- A distractor must be a plausible distortion of something actually said in the text (wrong scope, wrong speaker, reversed cause/effect, a detail from a different part). It must be false because of what the text says, not because it sounds extreme.`,
    `- Paraphrase for ALL options. Never copy a phrase of 4+ words from the text into the key only.`,
    `- Each distractor must be defensible to someone who misread the text and wrong to someone who read it.`,
  ];
  if (isReceptive(skill)) {
    base.push(
      `- Self-check before output: cover the text and read only the question and options. If one option is clearly the likeliest, rewrite the options.`
    );
  }
  return base.join("\n");
}

/** Grammar / vocabulary items at B2+ must sit in discourse, not isolated sentences. */
export function contextRules(skill: string, cefr: string): string {
  if (!["GRAMMAR", "VOCABULARY"].includes(skill) || !isAdvanced(cefr)) return "";
  const common = [
    `CONTEXT RULES (B2+):`,
    `- Provide a 2–4 sentence context ("context" field) and place the gap inside it. The correct option must be decidable only from the wider context (reference, tense continuity, register, contrast), not from the gapped sentence alone.`,
  ];
  if (skill === "VOCABULARY") {
    common.push(
      `- Difficulty must come from collocation, connotation or precision in context, NOT from word rarity. Do not use words that are rare merely to be hard.`,
      `- Distractors must be near-synonyms that fail on collocation or connotation; all must be real, common-enough words. Exactly one must fit.`
    );
  } else {
    common.push(
      `- Distractors must be forms a learner actually produces (wrong tense/aspect for the time reference, wrong modal, article/determiner misuse, wrong clause linkage), not nonsense.`
    );
  }
  return common.join("\n");
}

export function buildQualityBlock(skill: string, cefr: string, itemType: string): string {
  const isMcq = ["MULTIPLE_CHOICE", "FILL_IN_BLANKS", "DRAG_DROP"].includes(itemType);
  return [isMcq ? optionWritingRules(skill, cefr) : "", demandGuidance(skill, cefr), contextRules(skill, cefr)]
    .filter(Boolean)
    .join("\n\n");
}

export function isDemandAllowed(cefr: string, demand: string | undefined): boolean {
  if (!demand) return false;
  const allowed = ALLOWED_DEMAND_BY_CEFR[cefr];
  return !allowed || (allowed as readonly string[]).includes(demand);
}

/** Rules for matching items (match speakers / paragraphs to statements). */
export function matchingRules(skill: string): string {
  const zoneHint = skill === "LISTENING"
    ? `Rows are the speakers, named exactly as they appear in the recording (e.g. "Maria").`
    : `Rows are labelled parts of the passage (e.g. "Paragraph 2") or named people in it.`;
  return [
    `MATCHING RULES:`,
    `- ${zoneHint}`,
    `- Provide 3–4 "pairs" (row + the answer that belongs to it) and 1–2 "extraItems" (plausible answers that belong to NO row).`,
    `- Every answer must be a PARAPHRASE of something said/written, never a copied phrase of 4+ words.`,
    `- All answers (including extras) must be similar in length (within 25%), register and level of detail. No answer may be identifiable by length or tone.`,
    `- Each answer must be true of exactly one row. At least two answers must be on the same sub-topic, so a row cannot be matched by topic words alone.`,
    `- Extras should be distortions of what is actually said (wrong speaker, reversed, or a point mentioned but not endorsed) — never absurd.`,
    `- Do not use absolutes (only, always, never, entirely, exclusively) in any answer.`,
    `- The task must be impossible to complete well without the ${skill === "LISTENING" ? "recording" : "passage"}.`,
  ].join("\n");
}

/** Extra rules when matching headings to paragraphs of a reading passage. */
export function headingRules(): string {
  return [
    `HEADING MATCHING RULES:`,
    `- Number the passage paragraphs with a leading marker: "[1] …", "[2] …", "[3] …" (3–5 paragraphs).`,
    `- Rows ("zone") must be exactly "Paragraph 1", "Paragraph 2", … matching those markers; each "answer" is the heading for that paragraph.`,
    `- A heading must summarise the MAIN point of its paragraph, not a detail. Add 1–2 extra headings that fit the passage as a whole or a detail from one paragraph but are not the main point of any paragraph.`,
    `- Headings must not reuse the paragraph's own key words; paraphrase them.`,
    `- A heading must NOT reveal where a paragraph sits in the text. Do not write headings about introductions, overviews, background, "how it began", future plans, outlook, conclusions or summaries, and do not use first/last/finally/next/eventually. Each heading names a specific TOPIC that could belong to any position.`,
    `- Make at least two headings about related sub-topics so a paragraph cannot be matched by a single topic word.`,
  ].join("\n");
}

/** Rules for "choose the N statements" items. */
export function selectionRules(skill: string): string {
  return [
    `SELECTION RULES (choose exactly N statements):`,
    `- Provide "correct" (2 or 3 statements the ${skill === "LISTENING" ? "speaker(s) would agree with / that are supported by the recording" : "writer would agree with / that the passage supports"}) and "distractors" (2–4 statements that are NOT supported).`,
    `- All statements must have the same register, length (within 25%) and degree of hedging. A correct statement must not be the most balanced or academic-sounding one.`,
    `- No absolutes (only, always, never, entirely, exclusively, completely, impossible) in distractors unless a correct statement also contains one.`,
    `- Each distractor is a plausible distortion (wrong speaker, reversed cause, mentioned but not endorsed, true but unrelated to the question). Each correct statement is a PARAPHRASE, never a copied phrase of 4+ words.`,
    `- The prompt must state the number to choose, e.g. "Choose the TWO statements …".`,
    `- The task must be impossible to complete well without the ${skill === "LISTENING" ? "recording" : "passage"}.`,
  ].join("\n");
}
