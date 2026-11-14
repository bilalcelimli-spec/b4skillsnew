/**
 * Age context for generated items (bank expansion Faz 2).
 *
 * Faz 1 showed that an age line in the prompt is not enough: 11 of 36 TEEN
 * drafts drifted to university, postgraduate or workplace settings, and 15 of
 * 36 used the same "community centre" with the same four names. Two causes
 * sat in the generator: TEEN cells drew from the adult settings list, and the
 * name/setting picker always took the first entries of each list.
 *
 * This module holds the age-specific settings, the rotation, and a
 * deterministic gate that rejects under-16 drafts whose text is set in adult
 * life. The gate runs before the (paid) model gates.
 */

export type AgeBand = "YOUNG_LEARNER" | "TEEN" | "ADULT" | "UNIVERSAL";

export const DIVERSE_NAMES = [
  // Global, pronounceable, not stereotypically role-assigned
  "Amara", "Kenji", "Sofia", "Ravi", "Malia", "Dario", "Yuna", "Chidi",
  "Fatima", "Lena", "Omar", "Priya", "Elias", "Yuki", "Tobias", "Nadia",
  "Kwame", "Ingrid", "Tariq", "Hana", "Marcus", "Leila", "Soren", "Zara",
  "Arnav", "Mia", "Emeka", "Elif", "Jonas", "Aiko", "Daniel", "Rosa",
  "Mateo", "Ayesha", "Finn", "Noor", "Kofi", "Ines", "Luca", "Mei",
  "Santiago", "Amina", "Oskar", "Thandi", "Rafael", "Selin", "Hiro", "Esther",
];

export const ADULT_SETTINGS = [
  "a community centre", "an international university", "a research institute",
  "a local library", "a public park", "a small business", "a community garden",
  "a tech start-up", "a hospital", "a train station", "a neighbourhood café",
  "an online platform", "a cultural exchange programme", "a sports facility",
  "a city council meeting", "a museum", "a hotel reception", "a recycling centre",
  "a farmers' market", "a coworking space", "a ferry terminal", "a radio station",
];

/** Settings an 11-14 year old lives in. No university, workplace or adult-money contexts. */
export const TEEN_SETTINGS = [
  "a secondary school classroom", "an after-school club", "a youth football team", "a school trip",
  "a family holiday", "a science fair", "a summer camp", "a skate park", "a local museum",
  "a school band rehearsal", "a neighbourhood market", "a school newspaper", "a cinema with friends",
  "a cooking class for teenagers", "a nature reserve", "a school sports day", "a library homework club",
  "a gaming club", "a drama club", "a cycling trip", "a swimming competition", "a family celebration",
  "a coding workshop for students", "an exchange student's first week",
];

export const YOUNG_LEARNER_SETTINGS = [
  "a classroom", "the school playground", "a zoo", "a farm", "a birthday party",
  "the beach", "a family kitchen", "a toy shop", "a school trip", "a garden",
  "the school library", "a swimming pool", "a picnic in the park", "a child's bedroom",
];

export function settingsFor(age: string | undefined): string[] {
  return age === "YOUNG_LEARNER" ? YOUNG_LEARNER_SETTINGS : age === "TEEN" ? TEEN_SETTINGS : ADULT_SETTINGS;
}

/** FNV-1a; stable across runs so a cell + batch index + seed always gets the same picks. */
export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}

/**
 * n distinct entries starting at an offset derived from the key. Successive
 * batch indices step by n, so the chunks of one run never repeat a pick until
 * the list is exhausted, and different cells start at different places.
 */
export function rotatePick<T>(list: T[], n: number, key: string, batchIndex: number): T[] {
  if (!list.length) return [];
  const start = (hashString(key) + batchIndex * n) % list.length;
  return Array.from({ length: Math.min(n, list.length) }, (_, i) => list[(start + i) % list.length]!);
}

/**
 * Adult-life contexts that do not belong in items for under-16 candidates.
 * Deliberately narrower than the review hint list: words like "office" or
 * "meeting" are common in teen texts (post office, team meeting).
 */
const ADULT_CONTEXT = /\b(universit(y|ies)|undergraduates?|postgraduates?|professors?|lecturers?|thesis|dissertation|phd|mortgages?|salar(y|ies)|wages?|pay ?rise|wine|beer|alcohol\w*|cocktails?|pubs?|nightclubs?|divorc\w*|employers?|landlords?|loans?|debts?|tax(es|ation)?|pensions?|retire(d|ment)|redundan\w*|stock market|shares portfolio|investors?|husband|wife|dating|boyfriend|girlfriend|pregnan\w*|gambl\w*|casino|cigarettes?|smoking|vap(e|ing)|board meeting|quarterly|clients?|line manager|job interview|recruitment|colleagues?)\b/gi;

/** Extra words that are fine for teens but not for 7-10 year olds. */
const TEEN_ONLY = /\b(exams? results?|part-time job|social media|deadline|budget|news report|crime|accident|hospital)\b/gi;

function sourceText(content: Record<string, unknown> | null | undefined): string {
  const c = content ?? {};
  const options = Array.isArray(c.options) ? (c.options as unknown[]).map((o) => (typeof o === "string" ? o : (o as { text?: string })?.text ?? "")) : [];
  const pairs = Array.isArray(c.pairs) ? (c.pairs as Array<{ zone?: string; answer?: string }>).flatMap((p) => [p?.zone ?? "", p?.answer ?? ""]) : [];
  const extra = Array.isArray(c.extraItems) ? (c.extraItems as unknown[]).map(String) : [];
  return [c.passage, c.text, c.ttsScript, c.transcript, c.context, c.question, c.stem, c.prompt, ...options, ...pairs, ...extra]
    .filter((x) => typeof x === "string" && x).join("\n");
}

/** Adult-context terms found in an under-16 draft (empty for ADULT / UNIVERSAL cells). */
export function ageContextViolations(content: Record<string, unknown> | null | undefined, age: string | undefined): string[] {
  if (age !== "TEEN" && age !== "YOUNG_LEARNER") return [];
  const text = sourceText(content);
  const hits = [...(text.match(ADULT_CONTEXT) ?? []), ...(age === "YOUNG_LEARNER" ? text.match(TEEN_ONLY) ?? [] : [])];
  return [...new Set(hits.map((h) => h.toLowerCase()))];
}

/** Prompt rules for 11-14 year olds; the age range comes from the cell. */
export function teenRules(ageRange: [number, number] = [11, 14]): string {
  const [lo, hi] = ageRange;
  return [
    `TEEN RULES (candidates are ${lo}-${hi} years old):`,
    `- Characters are teenagers of this age, their families, teachers, coaches or club leaders. Adults appear only in those roles.`,
    `- Settings are a teenager's life: school, clubs, sport, hobbies, family, friends, holidays, local places, age-appropriate online life.`,
    `- Never: university, lectures, professors, postgraduate study, jobs, offices, colleagues, salaries, loans, rent, taxes, dating, alcohol, gambling.`,
    `- Abstract or academic topics are allowed only as a school project or a club activity, explained for this age.`,
    `- B2 difficulty comes from language and reasoning (inference, attitude, contrast), not from adult subject matter.`,
  ].join("\n");
}
