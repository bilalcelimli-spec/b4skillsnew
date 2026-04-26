export type StudioItemStatus =
  | "Draft"
  | "Linguistic Review"
  | "Age & Bias Review"
  | "Psychometric Ready"
  | "Pilot"
  | "Published"
  | "Flagged";
export type ProductLine =
  | "Primary (7-10)"
  | "Junior Suite (11-14)"
  | "15-Min Diagnostic"
  | "Academia"
  | "Corporate"
  | "Language Schools";

export interface StudioItem {
  id: string;
  productLine: ProductLine;
  skill: "Reading" | "Listening" | "Grammar" | "Vocabulary" | "Speaking" | "Writing";
  subSkill: string;
  cefrLevel: string; // A1, A2, B1, B2, C1, C2
  status: StudioItemStatus;
  irt: { diff: number; disc: number; guess: number }; // b, a, c parameters
  content: {
    passage?: string;
    prompt: string;
    options?: { text: string; rationale: string; isCorrect: boolean }[];
    rubric?: string; // for speaking/writing
  };
  metrics?: { facility: number; ptBiserial: number; exposure: number };
}

/** Local preview list; add items in admin or import — no baked-in demo rows. */
export const studioItems: StudioItem[] = [];
