/**
 * LinguAdapt CEFR Framework
 *
 * This module is the single source of truth for all CEFR expertise in the platform.
 * Based on:
 *  - Council of Europe — Common European Framework of Reference for Languages (2001, 2018 Companion Volume)
 *  - English Profile Programme research corpus
 *  - ALTE (Association of Language Testers in Europe) Can-Do statements
 *
 * Covers: levels, theta thresholds, Can-Do descriptors, sub-skill rubrics,
 * score-to-CEFR mapping, job/academic equivalences, and level colour palette.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. LEVEL DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────
export type CefrLevel = "PRE_A1" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export interface CefrLevelMeta {
  level: CefrLevel;
  label: string;               // Human-friendly title
  group: "Basic" | "Independent" | "Proficient";
  groupShort: "A" | "B" | "C";
  theta: { min: number; max: number };  // IRT theta range
  percentRange: { min: number; max: number };  // Approximate % score
  color: string;               // Tailwind text colour
  bg: string;                  // Tailwind background
  border: string;              // Tailwind border
  hex: string;                 // Hex colour (charts / non-Tailwind)
  gse: { min: number; max: number };   // Pearson GSE scale
  ielts?: { min: number; max: number };
  toefl?: { min: number; max: number };
  camebridge?: string;         // Cambridge exam mapping
  summary: string;             // One-sentence summary
}

export const CEFR_LEVELS: CefrLevelMeta[] = [
  {
    level: "PRE_A1",
    label: "Pre-A1 (Beginner)",
    group: "Basic",
    groupShort: "A",
    theta: { min: -Infinity, max: -3.0 },
    percentRange: { min: 0, max: 10 },
    color: "text-gray-600",
    bg: "bg-gray-100",
    border: "border-gray-300",
    hex: "#9ca3af",
    gse: { min: 0, max: 9 },
    summary: "No functional command of English. Recognises very basic words and phrases.",
  },
  {
    level: "A1",
    label: "A1 (Breakthrough)",
    group: "Basic",
    groupShort: "A",
    theta: { min: -3.0, max: -1.75 },
    percentRange: { min: 10, max: 25 },
    color: "text-red-500",
    bg: "bg-red-50",
    border: "border-red-300",
    hex: "#ef4444",
    gse: { min: 10, max: 21 },
    ielts: { min: 0, max: 2.5 },
    toefl: { min: 0, max: 30 },
    camebridge: "Cambridge Starter",
    summary: "Can understand and use familiar everyday expressions and very basic phrases.",
  },
  {
    level: "A2",
    label: "A2 (Waystage)",
    group: "Basic",
    groupShort: "A",
    theta: { min: -1.75, max: -0.5 },
    percentRange: { min: 25, max: 42 },
    color: "text-orange-500",
    bg: "bg-orange-50",
    border: "border-orange-300",
    hex: "#f97316",
    gse: { min: 22, max: 35 },
    ielts: { min: 2.5, max: 3.5 },
    toefl: { min: 31, max: 54 },
    camebridge: "Cambridge KET",
    summary: "Can understand sentences and frequently used expressions related to personal information.",
  },
  {
    level: "B1",
    label: "B1 (Threshold)",
    group: "Independent",
    groupShort: "B",
    theta: { min: -0.5, max: 0.5 },
    percentRange: { min: 42, max: 60 },
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    border: "border-yellow-400",
    hex: "#eab308",
    gse: { min: 36, max: 46 },
    ielts: { min: 3.5, max: 4.5 },
    toefl: { min: 55, max: 71 },
    camebridge: "Cambridge PET",
    summary: "Can understand and produce relevant information in familiar situations and personal interest areas.",
  },
  {
    level: "B2",
    label: "B2 (Vantage / Upper-Intermediate)",
    group: "Independent",
    groupShort: "B",
    theta: { min: 0.5, max: 1.5 },
    percentRange: { min: 60, max: 76 },
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-400",
    hex: "#3b82f6",
    gse: { min: 47, max: 58 },
    ielts: { min: 4.5, max: 6.0 },
    toefl: { min: 72, max: 94 },
    camebridge: "Cambridge FCE",
    summary: "Can understand complex texts and interact with fluency and spontaneity with native speakers.",
  },
  {
    level: "C1",
    label: "C1 (Effective Operational Proficiency / Advanced)",
    group: "Proficient",
    groupShort: "C",
    theta: { min: 1.5, max: 2.5 },
    percentRange: { min: 76, max: 90 },
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    border: "border-indigo-400",
    hex: "#6366f1",
    gse: { min: 59, max: 75 },
    ielts: { min: 6.0, max: 7.5 },
    toefl: { min: 95, max: 109 },
    camebridge: "Cambridge CAE",
    summary: "Can use language flexibly and effectively for social, academic, and professional purposes.",
  },
  {
    level: "C2",
    label: "C2 (Mastery / Proficiency)",
    group: "Proficient",
    groupShort: "C",
    theta: { min: 2.5, max: Infinity },
    percentRange: { min: 90, max: 100 },
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-400",
    hex: "#10b981",
    gse: { min: 76, max: 90 },
    ielts: { min: 7.5, max: 9.0 },
    toefl: { min: 110, max: 120 },
    camebridge: "Cambridge CPE",
    summary: "Can understand virtually everything and express themselves with precision and nuance.",
  },
];

// Quick lookup maps
export const CEFR_META: Record<CefrLevel, CefrLevelMeta> = Object.fromEntries(
  CEFR_LEVELS.map((l) => [l.level, l])
) as Record<CefrLevel, CefrLevelMeta>;

// ─────────────────────────────────────────────────────────────────────────────
// 2. THETA ↔ CEFR MAPPING (canonical — shared by engine, frontend, server)
// ─────────────────────────────────────────────────────────────────────────────
export const CEFR_THETA_THRESHOLDS: Record<string, number> = {
  PRE_A1: -3.0,
  A1:     -1.75,
  A2:     -0.5,
  B1:      0.5,
  B2:      1.5,
  C1:      2.5,
};

export function thetaToCefr(theta: number): CefrLevel {
  if (theta < CEFR_THETA_THRESHOLDS.PRE_A1) return "PRE_A1";
  if (theta < CEFR_THETA_THRESHOLDS.A1)     return "A1";
  if (theta < CEFR_THETA_THRESHOLDS.A2)     return "A2";
  if (theta < CEFR_THETA_THRESHOLDS.B1)     return "B1";
  if (theta < CEFR_THETA_THRESHOLDS.B2)     return "B2";
  if (theta < CEFR_THETA_THRESHOLDS.C1)     return "C1";
  return "C2";
}

export function cefrToTheta(level: CefrLevel): number {
  const meta = CEFR_META[level];
  if (!meta) return 0;
  const { min, max } = meta.theta;
  const lo = isFinite(min) ? min : -4;
  const hi = isFinite(max) ? max : 4;
  return (lo + hi) / 2;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. CAN-DO DESCRIPTORS (Council of Europe & ALTE)
// ─────────────────────────────────────────────────────────────────────────────
export type SkillDomain = "reading" | "listening" | "writing" | "speaking" | "interaction";

export interface CanDoDescriptor {
  level: CefrLevel;
  domain: SkillDomain;
  descriptors: string[];
}

export const CAN_DO_DESCRIPTORS: CanDoDescriptor[] = [
  // ------- A1 -------
  { level: "A1", domain: "reading",
    descriptors: [
      "Can understand familiar names, words and very simple sentences (notices, posters, catalogues).",
      "Can recognise numbers, prices and times.",
    ]
  },
  { level: "A1", domain: "listening",
    descriptors: [
      "Can understand very slow, carefully articulated speech with long pauses.",
      "Can follow very basic spoken instructions.",
    ]
  },
  { level: "A1", domain: "writing",
    descriptors: [
      "Can write a short, simple postcard.",
      "Can fill in forms with personal details.",
    ]
  },
  { level: "A1", domain: "speaking",
    descriptors: [
      "Can produce simple isolated phrases about people and places.",
      "Can ask and answer simple questions about personal details.",
    ]
  },
  // ------- A2 -------
  { level: "A2", domain: "reading",
    descriptors: [
      "Can read short, simple texts (personal letters, menus, schedules) containing high-frequency vocabulary.",
      "Can understand short instructions and signs.",
    ]
  },
  { level: "A2", domain: "listening",
    descriptors: [
      "Can understand phrases and expressions related to areas of immediate priority.",
      "Can grasp the main point in short, clear messages.",
    ]
  },
  { level: "A2", domain: "writing",
    descriptors: [
      "Can write short, simple notes related to matters in areas of immediate need.",
      "Can write a very simple personal letter.",
    ]
  },
  { level: "A2", domain: "speaking",
    descriptors: [
      "Can describe family, living conditions, education and present/past job.",
      "Can use connected phrases to describe experiences and events.",
    ]
  },
  // ------- B1 -------
  { level: "B1", domain: "reading",
    descriptors: [
      "Can understand texts that consist mainly of high-frequency everyday or job-related language.",
      "Can understand narratives and personal letters where the writer is describing feelings and wishes.",
    ]
  },
  { level: "B1", domain: "listening",
    descriptors: [
      "Can understand the main points of clear standard speech on familiar matters.",
      "Can follow a lecture or talk within own field if the topic is familiar.",
    ]
  },
  { level: "B1", domain: "writing",
    descriptors: [
      "Can write straightforward connected text on topics within familiar fields.",
      "Can write personal letters describing experiences and impressions.",
    ]
  },
  { level: "B1", domain: "speaking",
    descriptors: [
      "Can keep going comprehensibly even though pausing for grammatical and lexical planning.",
      "Can express the main point with reasonable precision.",
    ]
  },
  // ------- B2 -------
  { level: "B2", domain: "reading",
    descriptors: [
      "Can read articles and reports concerned with contemporary problems.",
      "Can understand contemporary literary prose.",
    ]
  },
  { level: "B2", domain: "listening",
    descriptors: [
      "Can understand extended speech and lectures and follow complex lines of argument.",
      "Can understand most TV news and current affairs programmes.",
    ]
  },
  { level: "B2", domain: "writing",
    descriptors: [
      "Can write clear, detailed text on a wide range of subjects.",
      "Can write an essay or report, passing on information or giving reasons for or against.",
    ]
  },
  { level: "B2", domain: "speaking",
    descriptors: [
      "Can interact spontaneously and fluently with native speakers without strain.",
      "Can present clear, detailed descriptions on a wide range of subjects.",
    ]
  },
  // ------- C1 -------
  { level: "C1", domain: "reading",
    descriptors: [
      "Can understand long, complex factual and literary texts, appreciating distinctions of style.",
      "Can understand specialised articles outside own field.",
    ]
  },
  { level: "C1", domain: "listening",
    descriptors: [
      "Can understand extended speech even when it is not clearly structured.",
      "Can understand TV programs and films without too much effort.",
    ]
  },
  { level: "C1", domain: "writing",
    descriptors: [
      "Can express ideas fluently and spontaneously without much obvious searching for expressions.",
      "Can use language flexibly and effectively for social, academic and professional purposes.",
    ]
  },
  { level: "C1", domain: "speaking",
    descriptors: [
      "Can describe or narrate, integrating sub-themes and developing points.",
      "Can handle abstract and linguistically demanding subjects with sophistication.",
    ]
  },
  // ------- C2 -------
  { level: "C2", domain: "reading",
    descriptors: [
      "Can understand virtually every form of written language including abstract and structurally complex texts.",
    ]
  },
  { level: "C2", domain: "listening",
    descriptors: [
      "Can understand any native speaker, accounting for regional accents.",
      "Can follow complex speeches, arguments and academic lectures without effort.",
    ]
  },
  { level: "C2", domain: "writing",
    descriptors: [
      "Can write clear, smoothly flowing, complex letters, reports or articles with appropriate style.",
      "Can write summaries and reviews of professional or literary works.",
    ]
  },
  { level: "C2", domain: "speaking",
    descriptors: [
      "Can convey finer shades of meaning precisely using a wide lexical range.",
      "Can reformulate ideas in differing linguistic forms to give emphasis or restate.",
    ]
  },
];

export function getCanDo(level: CefrLevel, domain?: SkillDomain): CanDoDescriptor[] {
  return CAN_DO_DESCRIPTORS.filter(
    (d) => d.level === level && (!domain || d.domain === domain)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. SCORING RUBRICS — per-domain, per-level expected quality benchmarks
// ─────────────────────────────────────────────────────────────────────────────
export interface CefrRubric {
  level: CefrLevel;
  domain: "writing" | "speaking";
  grammar: string;
  vocabulary: string;
  coherence: string;
  taskAchievement: string;
  fluency?: string;         // Speaking only
  pronunciation?: string;   // Speaking only
  scoreRange: { min: number; max: number }; // approximate 0–100
}

export const CEFR_RUBRICS: CefrRubric[] = [
  { level: "A1", domain: "writing",
    grammar: "Uses only the simplest structures; frequent basic errors.", vocabulary: "Very limited range of words.", coherence: "Minimal connectors (and, but).", taskAchievement: "Addresses only the most basic elements; very limited content.", scoreRange: { min: 0, max: 25 } },
  { level: "A1", domain: "speaking",
    grammar: "Very limited grammatical control.", vocabulary: "Very limited, short stock phrases.", coherence: "Can link with 'and', 'then'.", taskAchievement: "Only basic personal information.", fluency: "Frequent long pauses and false starts.", pronunciation: "Heavily influenced by L1; difficult to understand at times.", scoreRange: { min: 0, max: 25 } },
  { level: "A2", domain: "writing",
    grammar: "Uses basic sentence patterns.", vocabulary: "Limited basic vocabulary.", coherence: "Uses simple connectors.", taskAchievement: "Can produce simple sentences on everyday topics.", scoreRange: { min: 20, max: 42 } },
  { level: "A2", domain: "speaking",
    grammar: "Limited repertoire; basic sentence forms.", vocabulary: "Adequate for simple needs.", coherence: "Can link with basic connectors.", taskAchievement: "Can handle simple, routine interactions.", fluency: "Can manage short isolated phrases with pauses.", pronunciation: "Pronunciation is generally clear, though sometimes influenced by L1.", scoreRange: { min: 20, max: 42 } },
  { level: "B1", domain: "writing",
    grammar: "Reasonable control of B1 grammar; some errors.", vocabulary: "Adequate for familiar topics.", coherence: "Uses common connecting words and sequencing.", taskAchievement: "Can address the task with relevant information.", scoreRange: { min: 40, max: 62 } },
  { level: "B1", domain: "speaking",
    grammar: "Uses a range of simple structures correctly.", vocabulary: "Sufficient for straightforward communication.", coherence: "Can link series of shorter elements.", taskAchievement: "Can maintain interaction and give information.", fluency: "Relatively even tempo; pausing for planning is normal.", pronunciation: "Clearly intelligible even if accent is evident.", scoreRange: { min: 40, max: 62 } },
  { level: "B2", domain: "writing",
    grammar: "Good grammatical control; few errors.", vocabulary: "Good range including idiomatic expressions.", coherence: "Can use a variety of cohesive devices.", taskAchievement: "Addresses all parts of the task with explanations.", scoreRange: { min: 60, max: 78 } },
  { level: "B2", domain: "speaking",
    grammar: "Good grammatical control; slips corrected.", vocabulary: "Varied and often idiomatic.", coherence: "Develops arguments with clear referencing.", taskAchievement: "Can participate actively in discussions.", fluency: "Can initiate, maintain and close discourse naturally.", pronunciation: "Clear and natural; slight accent acceptable.", scoreRange: { min: 60, max: 78 } },
  { level: "C1", domain: "writing",
    grammar: "Consistent grammatical control of complex language.", vocabulary: "Wide range; strong collocation awareness.", coherence: "Sophisticated use of connecting expressions.", taskAchievement: "Clear, well-structured, detailed text.", scoreRange: { min: 76, max: 90 } },
  { level: "C1", domain: "speaking",
    grammar: "Consistently maintains high degree of grammatical accuracy.", vocabulary: "Good command of broad lexical repertoire.", coherence: "Uses discourse markers fluently.", taskAchievement: "Can present and argue complex ideas persuasively.", fluency: "Spontaneous, natural; smoothly reformulates when needed.", pronunciation: "Clear, natural prosody; minimal non-native influence.", scoreRange: { min: 76, max: 90 } },
  { level: "C2", domain: "writing",
    grammar: "Maintains consistent grammatical control; errors are rare.", vocabulary: "Full mastery including nuanced and stylistically varied choices.", coherence: "Can create coherent and cohesive texts.", taskAchievement: "Sophisticated, accurate and well-structured text.", scoreRange: { min: 88, max: 100 } },
  { level: "C2", domain: "speaking",
    grammar: "Precise and virtually error-free.", vocabulary: "Full mastery; exploits connotation, register and nuance.", coherence: "Highly coherent with exceptional use of discourse markers.", taskAchievement: "Responds to all aspects with precision and sophistication.", fluency: "Spontaneous and effortless; on par with educated native speakers.", pronunciation: "May retain slight accent; fully intelligible with natural prosody.", scoreRange: { min: 88, max: 100 } },
];

export function getRubric(level: CefrLevel, domain: "writing" | "speaking"): CefrRubric | undefined {
  return CEFR_RUBRICS.find((r) => r.level === level && r.domain === domain);
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. CAREER / ACADEMIC CONTEXT
// ─────────────────────────────────────────────────────────────────────────────
export interface CefrContext {
  level: CefrLevel;
  academic: string[];
  professional: string[];
  visaOrMigration?: string[];
}

export const CEFR_CONTEXTS: CefrContext[] = [
  { level: "A1", academic: ["Not admitted to academic programmes in English"], professional: ["Basic hotel/cleaning roles with ESL support"] },
  { level: "A2", academic: ["Pre-sessional language courses"], professional: ["Low-skilled manual labour with some English exposure"] },
  { level: "B1", academic: ["Foundation / pre-degree programmes (IELTS 4.0–4.5 equivalent)"], professional: ["Service industry, retail with customer contact", "Support staff roles"],
    visaOrMigration: ["UK: meets most basic visa requirements at A2–B1"] },
  { level: "B2", academic: ["Undergraduate study at many UK/EU universities (IELTS 5.5–6.0)", "ERASMUS exchange programmes"],
    professional: ["Office and administrative roles", "Junior engineering / IT positions", "Nursing (with additional support)"],
    visaOrMigration: ["UK Skilled Worker Visa: B2 sufficient for most occupations"] },
  { level: "C1", academic: ["Postgraduate (Masters / PhD) programmes globally (IELTS 6.5–7.0)", "Ivy League / Russell Group undergraduate"],
    professional: ["Management roles", "Finance, Law, Medicine, Academia", "Senior corporate positions"],
    visaOrMigration: ["Points-based immigration systems: high points (Australia, Canada, NZ, UK)"] },
  { level: "C2", academic: ["Most Prestigious Masters / PhD programmes (IELTS 7.5+)"],
    professional: ["Senior leadership", "High-stakes legal, medical, diplomatic roles", "Authors, translators, broadcast journalists"],
    visaOrMigration: ["Full language exemption in most immigration systems"] },
];

// ─────────────────────────────────────────────────────────────────────────────
// 6. ITEM DIFFICULTY ↔ CEFR (for auto-item generator & CAT selector)
// ─────────────────────────────────────────────────────────────────────────────
export const CEFR_DIFFICULTY_MAP: Record<string, number> = {
  PRE_A1: -3.5,
  A1:     -2.5,
  A2:     -1.25,
  B1:      0.0,
  B2:      1.0,
  C1:      2.0,
  C2:      3.0,
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. HELPER UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/** Return the next CEFR level (or undefined if already at C2). */
export function nextCefrLevel(level: CefrLevel): CefrLevel | undefined {
  const order: CefrLevel[] = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
  const idx = order.indexOf(level);
  return idx < order.length - 1 ? order[idx + 1] : undefined;
}

/** Distance between two CEFR levels (in steps). */
export function cefrDistance(from: CefrLevel, to: CefrLevel): number {
  const order: CefrLevel[] = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
  return order.indexOf(to) - order.indexOf(from);
}

/** Estimate score from 0–100 given a theta value. */
export function thetaToPercent(theta: number): number {
  // Logistic mapping: theta -4..+4 → 0..100
  const pct = 100 / (1 + Math.exp(-0.8 * theta));
  return Math.round(Math.max(0, Math.min(100, pct)));
}

/** Rough IELTS band equivalent (for display purposes only). */
export function cefrToIelts(level: CefrLevel): string {
  const meta = CEFR_META[level];
  if (!meta?.ielts) return "N/A";
  return `${meta.ielts.min}–${meta.ielts.max}`;
}

/** Rough TOEFL iBT range equivalent. */
export function cefrToToefl(level: CefrLevel): string {
  const meta = CEFR_META[level];
  if (!meta?.toefl) return "N/A";
  return `${meta.toefl.min}–${meta.toefl.max}`;
}

/** Returns a rich AI scoring prompt addendum specific to the CEFR level for writing/speaking. */
export function buildCefrRubricPrompt(level: CefrLevel, domain: "writing" | "speaking"): string {
  const rubric = getRubric(level, domain);
  const canDos = getCanDo(level, domain);
  if (!rubric) return "";
  return [
    `=== CEFR ${level} ${domain.toUpperCase()} RUBRIC ===`,
    `Grammar expectation: ${rubric.grammar}`,
    `Vocabulary expectation: ${rubric.vocabulary}`,
    `Coherence expectation: ${rubric.coherence}`,
    `Task Achievement: ${rubric.taskAchievement}`,
    ...(rubric.fluency ? [`Fluency expectation: ${rubric.fluency}`] : []),
    ...(rubric.pronunciation ? [`Pronunciation expectation: ${rubric.pronunciation}`] : []),
    `Expected score range for this level: ${rubric.scoreRange.min}–${rubric.scoreRange.max}/100`,
    ``,
    `CEFR Can-Do statements at this level:`,
    ...canDos.flatMap((d) => d.descriptors.map((s) => `• ${s}`)),
    ``,
    `Score the candidate AGAINST the ${level} level. If they clearly perform above/below, reflect this in both score and the cefrLevel field.`,
  ].join("\n");
}
