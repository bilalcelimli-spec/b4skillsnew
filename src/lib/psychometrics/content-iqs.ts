/**
 * Content IQS — a pre-calibration quality score computed from item content only.
 *
 * It deliberately ignores IRT a/b/c: before calibration those values are
 * seeded from the CEFR label, so any check against them is circular.
 * Empirical quality (point-biserial, infit/outfit, distractor stats, DIF)
 * belongs in a separate post-calibration score.
 */

export interface ContentIqsInput {
  skill: string;
  cefrLevel: string;
  type: string;
  content?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
}

export interface ContentIqsResult {
  score: number;
  flags: ContentFlag[];
}

export interface ContentFlag {
  code: "LEXICAL_LIFT" | "TEST_WISENESS" | "DEMAND_BELOW_LEVEL" | "DEMAND_ABOVE_LEVEL" | "STRUCTURE";
  message: string;
  deduction: number;
}

const STOPWORDS = new Set(
  "about above after again against because before being below between could doing during each from have having here into just more most other over same should some such than that their them then there these they this those through under until very were what when where which while with would your".split(" ")
);

const ABSOLUTES = /\b(only|always|never|all|none|completely|entirely|every|must|impossible|exclusively)\b/i;

const LOW_DEMAND = new Set(["RECOGNITION", "EXPLICIT_DETAIL"]);
const HIGH_DEMAND = new Set(["INFERENCE", "WRITER_STANCE_OR_IMPLICATION", "SYNTHESIS_OR_EVALUATION"]);

function optionText(o: unknown): string {
  if (typeof o === "string") return o;
  if (o && typeof o === "object") return String((o as any).text ?? "");
  return "";
}

export function keyIndex(content: Record<string, any>): number {
  const opts: unknown[] = content.options ?? [];
  let ki = opts.findIndex((o) => (o as any)?.isCorrect === true);
  if (ki >= 0) return ki;
  const ca = content.correctAnswer;
  if (typeof ca === "number") return ca;
  if (ca != null) {
    ki = opts.findIndex((o, i) => (o as any)?.id === ca || String.fromCharCode(65 + i) === ca || optionText(o) === ca);
    if (ki >= 0) return ki;
  }
  return typeof content.correctIndex === "number" ? content.correctIndex : -1;
}

export function contentWords(text: string): string[] {
  return text.toLowerCase().split(/[^a-z']+/).filter((w) => w.length > 4 && !STOPWORDS.has(w));
}

/** Share of an option's content words that appear verbatim in the source text. */
export function overlapRatio(option: string, source: string): number {
  const words = contentWords(option);
  if (!words.length) return 0;
  const src = source.toLowerCase();
  return words.filter((w) => src.includes(w)).length / words.length;
}

export function calculateContentIqs(item: ContentIqsInput): ContentIqsResult {
  const flags: ContentFlag[] = [];
  const c = item.content ?? {};
  const opts: unknown[] = Array.isArray(c.options) ? c.options : [];
  const isMcq = item.type === "MULTIPLE_CHOICE" && opts.length >= 3;

  if (isMcq) {
    const ki = keyIndex(c);
    if (ki < 0 || ki >= opts.length) {
      flags.push({ code: "STRUCTURE", message: "Answer key could not be resolved", deduction: 40 });
    } else {
      const texts = opts.map(optionText);
      const distractors = texts.filter((_, i) => i !== ki);

      const source = String(c.passage ?? c.ttsScript ?? c.transcript ?? c.audioScript ?? c.stimulus ?? "");
      if (source && (item.skill === "READING" || item.skill === "LISTENING")) {
        const keyRatio = overlapRatio(texts[ki], source);
        const maxDist = Math.max(...distractors.map((d) => overlapRatio(d, source)));
        if (keyRatio >= 0.8 && keyRatio - maxDist >= 0.3) {
          flags.push({
            code: "LEXICAL_LIFT",
            message: `Key repeats the text almost verbatim (${Math.round(keyRatio * 100)}% vs best distractor ${Math.round(maxDist * 100)}%) — solvable by word matching`,
            deduction: 20,
          });
        }
      }

      const absInDistractors = distractors.filter((d) => ABSOLUTES.test(d)).length;
      const wise: string[] = [];
      if (absInDistractors >= 2 && !ABSOLUTES.test(texts[ki])) wise.push("absolutes appear only in distractors");
      const avgDist = distractors.reduce((s, d) => s + d.length, 0) / distractors.length;
      if (avgDist > 0 && texts[ki].length >= avgDist * 1.4 && texts[ki].length === Math.max(...texts.map((t) => t.length))) {
        wise.push("key is markedly the longest option");
      }
      if (wise.length) {
        flags.push({ code: "TEST_WISENESS", message: `Answerable by test-wiseness: ${wise.join("; ")}`, deduction: 10 * wise.length });
      }
    }
  }

  const demand = item.metadata?.cognitiveDemand as string | undefined;
  if (demand && (item.skill === "READING" || item.skill === "LISTENING")) {
    if (["B2", "C1", "C2"].includes(item.cefrLevel) && LOW_DEMAND.has(demand)) {
      flags.push({
        code: "DEMAND_BELOW_LEVEL",
        message: `${item.cefrLevel} item only requires ${demand.toLowerCase().replace(/_/g, " ")}`,
        deduction: item.cefrLevel === "B2" ? 10 : 20,
      });
    }
    if (["PRE_A1", "A1", "A2"].includes(item.cefrLevel) && HIGH_DEMAND.has(demand)) {
      flags.push({ code: "DEMAND_ABOVE_LEVEL", message: `${item.cefrLevel} item requires ${demand.toLowerCase().replace(/_/g, " ")}`, deduction: 15 });
    }
  }

  const score = Math.max(0, 100 - flags.reduce((s, f) => s + f.deduction, 0));
  return { score, flags };
}
