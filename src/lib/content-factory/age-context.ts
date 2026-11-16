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

/**
 * Voice gender for each name above, so TTS gives a boy's name a male voice
 * (the audio job guessed unknown names as an adult woman). Yuki and Noor are
 * used for girls in our items.
 */
export const NAME_GENDER: Readonly<Record<string, "F" | "M">> = Object.fromEntries([
  ...["Amara", "Sofia", "Malia", "Yuna", "Fatima", "Lena", "Priya", "Yuki", "Nadia", "Ingrid", "Hana", "Leila", "Zara", "Mia",
    "Elif", "Aiko", "Rosa", "Ayesha", "Noor", "Ines", "Mei", "Amina", "Thandi", "Selin", "Esther"].map((n) => [n, "F"] as const),
  ...["Kenji", "Ravi", "Dario", "Chidi", "Omar", "Elias", "Tobias", "Kwame", "Tariq", "Marcus", "Soren", "Arnav", "Emeka", "Jonas",
    "Daniel", "Mateo", "Finn", "Kofi", "Luca", "Santiago", "Oskar", "Rafael", "Hiro"].map((n) => [n, "M"] as const),
]);

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

/** Everyday public settings that suit both teenagers and adults (UNIVERSAL cells, e.g. Language Schools 12+). */
export const UNIVERSAL_SETTINGS = [
  "a language school", "a local library", "a public park", "a train station", "a neighbourhood café",
  "a museum", "a sports centre", "a farmers' market", "a cinema", "a bookshop", "a bus journey",
  "a city festival", "a youth hostel", "a photography club", "a volunteer clean-up day", "a music shop",
];

/**
 * Product-specific settings. Without these, Corporate and Academia drafts were
 * placed in random adult settings (a swimming pool notice for a workplace
 * reading cell, a coworking space for a university talk; dry run 2026-11-16).
 */
export const PRODUCT_SETTINGS: Record<string, string[]> = {
  corporate: [
    "an office team", "a customer service desk", "a logistics company", "a hotel management office",
    "a small manufacturing firm", "a software company", "a retail chain head office", "an IT help desk",
    "a sales department", "a warehouse", "a marketing agency", "an accounts department",
    "a staff training day", "a company canteen", "a reception desk", "a project team meeting",
  ],
  academia: [
    "a university lecture hall", "a seminar group", "a university library", "a student support office",
    "a laboratory class", "a tutor's office hours", "an academic writing centre", "a field trip for a geography course",
    "a university open day", "a research methods course", "an online course forum", "a student union meeting",
  ],
};

export function settingsFor(age: string | undefined, productLine?: string): string[] {
  if (productLine && PRODUCT_SETTINGS[productLine]) return PRODUCT_SETTINGS[productLine]!;
  return age === "YOUNG_LEARNER" ? YOUNG_LEARNER_SETTINGS : age === "TEEN" ? TEEN_SETTINGS
    : age === "UNIVERSAL" ? UNIVERSAL_SETTINGS : ADULT_SETTINGS;
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

/**
 * Character names used in the question or options that never occur in the
 * stimulus (passage / audio script). A receptive item that asks "According to
 * Jonas…" when Jonas is never mentioned cannot be answered from the text
 * (dry run 2026-11-16). Items without a stimulus (grammar, productive tasks)
 * return no findings.
 */
export function unanchoredNames(content: Record<string, unknown> | null | undefined): string[] {
  const c = content ?? {};
  const stimulus = [c.passage, c.text, c.ttsScript, c.transcript, c.context]
    .filter((x): x is string => typeof x === "string" && x.length > 0).join("\n");
  if (!stimulus) return [];
  const options = Array.isArray(c.options) ? (c.options as unknown[]).map((o) => (typeof o === "string" ? o : (o as { text?: string })?.text ?? "")) : [];
  const asked = [c.question, c.stem, ...options].filter((x) => typeof x === "string").join("\n");
  const has = (text: string, name: string) => new RegExp(`\\b${name}\\b`).test(text);
  return DIVERSE_NAMES.filter((name) => has(asked, name) && !has(stimulus, name));
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
