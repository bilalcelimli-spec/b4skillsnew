/**
 * Authoring shape for Academia listening sets: one recording, two questions.
 * Both questions of a recording are stored with the identical ttsScript, so
 * `passageKey` (assessment-engine/passage-cap.ts) groups them into one set.
 */
import type { CognitiveDemand } from "../../src/lib/content-factory/generation-guidelines.js";

export type AcademiaLevel = "B1" | "B2" | "C1" | "C2";
export type AcademiaGenre = "lecture" | "discussion" | "conversation" | "announcement" | "short_talk" | "presentation";
type Choice = readonly [text: string, rationale: string];

export interface AcademiaQuestion {
  subskill: string;
  demand: CognitiveDemand;
  /** What a correct response shows. */
  evidence: string;
  prompt: string;
  /** Index of the correct option (0-3). */
  key: 0 | 1 | 2 | 3;
  options: readonly [Choice, Choice, Choice, Choice];
}

export interface AcademiaRecording {
  /** e.g. ACA-LIS-B1-W01-01; the two items get the suffixes A and B. */
  code: string;
  level: AcademiaLevel;
  genre: AcademiaGenre;
  topic: string;
  title: string;
  /** Speaker labels used in the script ("Name: utterance" lines). Empty for an unlabelled monologue. */
  speakers: string[];
  script: string;
  questions: readonly [AcademiaQuestion, AcademiaQuestion];
}

let counters: Record<string, number> = {};

/** Numbers recordings per level in file order: ACA-LIS-<level>-W01-<nn>. */
export function recording(
  level: AcademiaLevel,
  genre: AcademiaGenre,
  topic: string,
  title: string,
  speakers: string[],
  script: string,
  questions: readonly [AcademiaQuestion, AcademiaQuestion],
): AcademiaRecording {
  counters[level] = (counters[level] ?? 0) + 1;
  const code = `ACA-LIS-${level}-W01-${String(counters[level]).padStart(2, "0")}`;
  return { code, level, genre, topic, title, speakers, script: script.trim(), questions };
}

export function question(
  subskill: string,
  demand: CognitiveDemand,
  evidence: string,
  prompt: string,
  key: 0 | 1 | 2 | 3,
  options: readonly [Choice, Choice, Choice, Choice],
): AcademiaQuestion {
  return { subskill, demand, evidence, prompt, key, options };
}
