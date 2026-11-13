/**
 * Deterministic proposals for the item context fields the bank leaves empty
 * (bank expansion plan, Faz 0): ageSuitability, genre, topic. No LLM.
 *
 * Only signals already stored on the item are used — product source tags,
 * `content.textType` / `content.taskType`, `content.topic` and `topic:` tags.
 * Anything without such a signal stays null for a later LLM or human pass.
 *
 * These fields are inside the review content hash (item-review-snapshot.ts),
 * so filling them after expert approvals would invalidate those approvals.
 * Backfill before review starts.
 */

import { GENRES_BY_SKILL, TOPICS } from "./blueprint.js";

export type AgeBand = "YOUNG_LEARNER" | "TEEN" | "ADULT" | "UNIVERSAL";

export interface ContextSource {
  skill: string;
  tags?: string[] | null;
  content?: Record<string, unknown> | null;
}

export interface ContextProposal {
  ageSuitability: AgeBand | null;
  genre: string | null;
  topic: string | null;
  /** Which stored signal each proposal came from. */
  evidence: { ageSuitability?: string; genre?: string; topic?: string };
}

const AGE_BY_SOURCE: Array<[AgeBand, string[]]> = [
  ["YOUNG_LEARNER", ["primary", "PRIMARY", "Primary (7-10)", "Primary"]],
  ["TEEN", ["junior", "JUNIOR", "JUNIOR_SUITE", "Junior Suite (11-14)"]],
  ["ADULT", ["academia", "academic", "ACADEMIA", "Academia", "corporate", "CORPORATE", "Corporate", "business",
    "specialized", "SPECIALIZED", "Specialized / Integrated Skills"]],
];

/** Mixed signals (e.g. junior + academia) are not resolved here. */
export function proposeAge(item: ContextSource): { value: AgeBand | null; evidence?: string } {
  const productLine = typeof item.content?.productLine === "string" ? item.content.productLine : null;
  const signals = [...(item.tags ?? []), ...(productLine ? [productLine] : [])];
  const bands = new Set<AgeBand>();
  let evidence: string | undefined;
  for (const [band, sources] of AGE_BY_SOURCE) {
    const hit = signals.find((s) => sources.includes(s));
    if (hit) { bands.add(band); evidence ??= hit; }
  }
  return bands.size === 1 ? { value: [...bands][0]!, evidence } : { value: null };
}

/** Free-text text/task type → controlled genre, checked in order (first match wins). */
const GENRE_RULES: Array<[RegExp, Record<string, string>]> = [
  [/notice|sign|label|leaflet|public information/i, { READING: "notice", WRITING: "report" }],
  [/e-?mail|message|postcard/i, { READING: "email", WRITING: "email" }],
  [/letter/i, { READING: "email", WRITING: "letter" }],
  [/blog/i, { READING: "blog" }],
  [/review/i, { READING: "review", WRITING: "review" }],
  [/interview/i, { READING: "interview", LISTENING: "interview" }],
  [/report/i, { READING: "report", WRITING: "report" }],
  [/opinion|argument|discursive/i, { READING: "opinion_column", WRITING: "essay", SPEAKING: "opinion" }],
  [/narrative|story|literary|diary/i, { READING: "narrative", WRITING: "story" }],
  [/essay|academic|philosoph|scientific|science|expository|feature|article|news|commentary/i,
    { READING: "article", WRITING: "essay" }],
  [/proposal/i, { WRITING: "proposal" }],
  [/dialogue|conversation/i, { LISTENING: "conversation" }],
  [/lecture/i, { LISTENING: "lecture" }],
  [/presentation|monologue/i, { LISTENING: "presentation", SPEAKING: "opinion" }],
  [/role ?play|situation/i, { SPEAKING: "situational" }],
  [/discussion/i, { LISTENING: "discussion", SPEAKING: "problem_solving" }],
  [/description|describe|picture/i, { SPEAKING: "picture_description" }],
  [/compar/i, { SPEAKING: "comparison" }],
  [/speculat|analytical/i, { SPEAKING: "problem_solving" }],
];

export function proposeGenre(item: ContextSource): { value: string | null; evidence?: string } {
  const raw = [item.content?.textType, item.content?.taskType, item.content?.genre].find((v) => typeof v === "string" && v.trim());
  if (typeof raw !== "string") return { value: null };
  const allowed = GENRES_BY_SKILL[item.skill] ?? [];
  if (allowed.includes(raw)) return { value: raw, evidence: raw };
  for (const [pattern, bySkill] of GENRE_RULES) {
    const genre = bySkill[item.skill];
    if (pattern.test(raw) && genre && allowed.includes(genre)) return { value: genre, evidence: raw };
  }
  return { value: null };
}

/** Keyword → controlled topic, checked in order. */
const TOPIC_RULES: Array<[RegExp, (typeof TOPICS)[number]]> = [
  [/school|student|academic|stud(y|ies)|learn|teacher|exam|pen.?pal|educat/i, "education"],
  [/work|job|career|office|business|employ|engineer|financial|econom/i, "work"],
  [/travel|trip|holiday|hostel|tourism|coastal|abroad/i, "travel"],
  [/transport|cycling|bus|train|traffic|commut/i, "transport"],
  [/algorithm|artificial intelligence|\bai\b|digital|technolog|computer|internet|online/i, "technology"],
  [/social media|news|media|documentary|film|television|advert/i, "media"],
  [/environment|climate|green|nature|wildlife|geograph|animal|plant|ocean|food waste/i, "environment"],
  [/health|sleep|diet|exercise|winter|medical|habit|memory|wellbeing/i, "health"],
  [/science|research|experiment|biolog|physic|chemi/i, "science"],
  [/\barts?\b|music|literat|narrat|culture|craft|authentic|histor|museum|tradition/i, "culture"],
  [/communit|neighbou?rhood|govern|society|social|citizen|moral|ethic|polic(e|ing)|bias|city|cities|urban/i, "society"],
  [/sport|game|hobby|leisure|weekend|park/i, "leisure"],
  [/shop|buy|price|consumer|budget|money/i, "consumer"],
  [/family|friend|home|birthday|personal|daily|routine|first day|new house/i, "personal_life"],
  [/innovat|invent|startup/i, "innovation"],
];

export function proposeTopic(item: ContextSource): { value: string | null; evidence?: string } {
  const tagTopic = (item.tags ?? []).find((t) => t.startsWith("topic:"))?.slice("topic:".length).replace(/_/g, " ");
  const raw = typeof item.content?.topic === "string" && item.content.topic.trim() ? item.content.topic : tagTopic;
  if (!raw) return { value: null };
  if ((TOPICS as readonly string[]).includes(raw)) return { value: raw, evidence: raw };
  for (const [pattern, topic] of TOPIC_RULES) if (pattern.test(raw)) return { value: topic, evidence: raw };
  return { value: null };
}

export function proposeContext(item: ContextSource): ContextProposal {
  const age = proposeAge(item);
  const genre = proposeGenre(item);
  const topic = proposeTopic(item);
  return {
    ageSuitability: age.value, genre: genre.value, topic: topic.value,
    evidence: {
      ...(age.evidence ? { ageSuitability: age.evidence } : {}),
      ...(genre.evidence ? { genre: genre.evidence } : {}),
      ...(topic.evidence ? { topic: topic.evidence } : {}),
    },
  };
}
