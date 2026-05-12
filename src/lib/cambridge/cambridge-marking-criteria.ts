/**
 * Cambridge Assessment English — Official Marking Criteria
 *
 * Implements the Cambridge 0–5 band descriptors for:
 *   • Writing — 4 criteria: Content, Communicative Achievement, Organisation, Language
 *   • Speaking — 5 criteria: Grammar & Vocabulary, Discourse Management,
 *                             Pronunciation, Interactive Communication, Global Achievement
 *
 * Sources:
 *   - Cambridge English Assessment: Writing & Speaking Mark Schemes (2024 editions)
 *   - FCE/CAE/CPE Handbooks for Teachers — Cambridge Assessment English
 *   - CEFR Companion Volume (Council of Europe, 2020)
 *   - Cambridge English Scale (CES) reporting framework
 *
 * Covers KET (A2) through CPE (C2).  YLE uses shield/star ratings; see cambridge-framework.ts.
 */

import type { CefrLevel } from "../cefr/cefr-framework.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. WRITING CRITERIA (bands 0–5, weighted equally per Cambridge scheme)
// ─────────────────────────────────────────────────────────────────────────────

export type WritingCriterion =
  | "CONTENT"
  | "COMMUNICATIVE_ACHIEVEMENT"
  | "ORGANISATION"
  | "LANGUAGE";

export interface BandDescriptor {
  band: 0 | 1 | 2 | 3 | 4 | 5;
  cefrRange: string;
  descriptor: string;
  keyFeatures: string[];
}

export interface WritingCriterionSpec {
  criterion: WritingCriterion;
  label: string;
  weight: number;           // Equal 0.25 per Cambridge scheme
  focus: string;
  bands: BandDescriptor[];
}

export const CAMBRIDGE_WRITING_CRITERIA: WritingCriterionSpec[] = [
  {
    criterion: "CONTENT",
    label: "Content",
    weight: 0.25,
    focus: "Whether the response addresses all parts of the task and is relevant throughout.",
    bands: [
      {
        band: 0, cefrRange: "Below A2",
        descriptor: "Response does not communicate. Nothing relevant to the task.",
        keyFeatures: ["Completely off-topic", "Incomprehensible", "Not attempted"],
      },
      {
        band: 1, cefrRange: "A2",
        descriptor: "Some content is communicated but the task is only minimally addressed. Many required points are missing or irrelevant.",
        keyFeatures: ["Only 1–2 task points addressed", "Much irrelevant content", "Very short response"],
      },
      {
        band: 2, cefrRange: "B1",
        descriptor: "The task is partially achieved. Some required content is included but key points may be missing or undeveloped.",
        keyFeatures: ["Roughly half the task addressed", "Some irrelevant content", "Required points present but not developed"],
      },
      {
        band: 3, cefrRange: "B2",
        descriptor: "The task is substantially achieved. All or most required content is present, though some points may lack development.",
        keyFeatures: ["Most required points addressed", "Generally relevant", "Some points briefly treated"],
      },
      {
        band: 4, cefrRange: "C1",
        descriptor: "The task is fully achieved. All required content is present and well developed with relevant detail.",
        keyFeatures: ["All task points fully addressed", "Appropriate detail and examples", "No irrelevant content"],
      },
      {
        band: 5, cefrRange: "C2",
        descriptor: "The task is expertly achieved. Content is comprehensive, perceptive, and entirely relevant with sophisticated development.",
        keyFeatures: ["All points addressed with depth", "Insightful treatment of topic", "Fully relevant and compelling"],
      },
    ],
  },
  {
    criterion: "COMMUNICATIVE_ACHIEVEMENT",
    label: "Communicative Achievement",
    weight: 0.25,
    focus: "Whether the response uses conventions of the genre appropriately and has the desired effect on the target reader.",
    bands: [
      {
        band: 0, cefrRange: "Below A2",
        descriptor: "Has a very negative effect on the target reader. No awareness of genre or register.",
        keyFeatures: ["No genre awareness", "Completely inappropriate register", "Fails to communicate"],
      },
      {
        band: 1, cefrRange: "A2",
        descriptor: "Communicates basic messages but uses few genre conventions. Register may be inappropriate.",
        keyFeatures: ["Minimal genre features", "Register inconsistent", "Very limited rhetorical effect"],
      },
      {
        band: 2, cefrRange: "B1",
        descriptor: "Communicates straightforward information using some genre conventions. Register is mostly appropriate.",
        keyFeatures: ["Some genre conventions present", "Mostly appropriate register", "Limited rhetorical range"],
      },
      {
        band: 3, cefrRange: "B2",
        descriptor: "Uses the conventions of the communicative task in a mostly effective way. Register and tone are appropriate for the target reader.",
        keyFeatures: ["Genre conventions used effectively", "Appropriate and consistent register", "Engages the target reader"],
      },
      {
        band: 4, cefrRange: "C1",
        descriptor: "Achieves the intended effect on the target reader using a full range of genre conventions skillfully. Register and tone are effective throughout.",
        keyFeatures: ["Full command of genre conventions", "Rhetorically effective", "Sophisticated register management"],
      },
      {
        band: 5, cefrRange: "C2",
        descriptor: "Achieves sophisticated communicative effects using expert command of the genre. Exceptional rhetorical skill and register precision.",
        keyFeatures: ["Expert genre command", "Compelling and precise effect on reader", "Masterful tone and register"],
      },
    ],
  },
  {
    criterion: "ORGANISATION",
    label: "Organisation",
    weight: 0.25,
    focus: "Whether the writing is logically organised, uses cohesive devices effectively, and has clear paragraphing.",
    bands: [
      {
        band: 0, cefrRange: "Below A2",
        descriptor: "No attempt at organisation. Text is a random collection of words or sentences.",
        keyFeatures: ["No structure", "No paragraphing", "No cohesion"],
      },
      {
        band: 1, cefrRange: "A2",
        descriptor: "Very basic organisation. Limited use of linking words (and, but, because). Paragraphing absent or random.",
        keyFeatures: ["Simple additive connectors only", "No paragraphing or one block paragraph", "Lacks logical sequence"],
      },
      {
        band: 2, cefrRange: "B1",
        descriptor: "Some organisation visible. Basic paragraph structure used. Simple cohesive devices used but repetitively.",
        keyFeatures: ["Basic paragraphing", "Limited range of connectors", "Some logical sequence"],
      },
      {
        band: 3, cefrRange: "B2",
        descriptor: "Ideas are organised clearly with effective use of paragraphing and cohesive devices. The text is easy to follow.",
        keyFeatures: ["Clear paragraphing with topic sentences", "Range of cohesive devices", "Logical and easy to follow"],
      },
      {
        band: 4, cefrRange: "C1",
        descriptor: "Well-organised with sophisticated paragraphing. Wide range of cohesive devices used naturally. Text flows smoothly throughout.",
        keyFeatures: ["Sophisticated paragraph structure", "Natural use of cohesion", "Seamless flow between ideas"],
      },
      {
        band: 5, cefrRange: "C2",
        descriptor: "Masterfully organised. Exceptional control of text structure and cohesion. Ideas flow with complete naturalness.",
        keyFeatures: ["Expert text architecture", "Cohesion invisible (natural)", "Seamless progression of complex ideas"],
      },
    ],
  },
  {
    criterion: "LANGUAGE",
    label: "Language",
    weight: 0.25,
    focus: "Range and accuracy of vocabulary and grammar. Includes errors and their effect on communication.",
    bands: [
      {
        band: 0, cefrRange: "Below A2",
        descriptor: "Persistent errors prevent communication. Very limited range of vocabulary and grammar.",
        keyFeatures: ["Errors in every sentence", "Minimal vocabulary range", "Grammar interferes with meaning"],
      },
      {
        band: 1, cefrRange: "A2",
        descriptor: "Very limited range of vocabulary and simple structures. Frequent errors that sometimes obscure meaning.",
        keyFeatures: ["Simple, frequently repeated vocabulary", "Errors are frequent and noticeable", "Basic structures only"],
      },
      {
        band: 2, cefrRange: "B1",
        descriptor: "Limited but adequate vocabulary. Simple and some complex structures used, but errors are present and occasionally impede communication.",
        keyFeatures: ["Adequate everyday vocabulary", "Mix of simple/complex structures", "Errors present but usually meaning clear"],
      },
      {
        band: 3, cefrRange: "B2",
        descriptor: "A range of vocabulary and grammar is used appropriately. Errors occur but rarely impede communication. Some evidence of less common items.",
        keyFeatures: ["Good range of vocabulary", "Mix of structures used effectively", "Errors minor and infrequent"],
      },
      {
        band: 4, cefrRange: "C1",
        descriptor: "Wide range of vocabulary and structures used flexibly and precisely. Errors are rare and minor. Evidence of idiomatic usage.",
        keyFeatures: ["Wide, precise vocabulary", "Complex structures controlled well", "Rare minor errors", "Idiomatic usage"],
      },
      {
        band: 5, cefrRange: "C2",
        descriptor: "Exceptional range of vocabulary and grammar used with precision and sophistication. Near error-free. Full idiomatic command.",
        keyFeatures: ["Exceptional vocabulary range", "Masterful grammatical control", "Virtually error-free", "Natural idiomatic expression"],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 2. SPEAKING CRITERIA (bands 0–5)
// ─────────────────────────────────────────────────────────────────────────────

export type SpeakingCriterion =
  | "GRAMMAR_VOCABULARY"
  | "DISCOURSE_MANAGEMENT"
  | "PRONUNCIATION"
  | "INTERACTIVE_COMMUNICATION"
  | "GLOBAL_ACHIEVEMENT";

export interface SpeakingCriterionSpec {
  criterion: SpeakingCriterion;
  label: string;
  weight: number;
  focus: string;
  bands: BandDescriptor[];
}

export const CAMBRIDGE_SPEAKING_CRITERIA: SpeakingCriterionSpec[] = [
  {
    criterion: "GRAMMAR_VOCABULARY",
    label: "Grammar and Vocabulary",
    weight: 0.25,
    focus: "Range and accuracy of grammatical structures and vocabulary. How effectively they are used to convey precise meaning.",
    bands: [
      {
        band: 0, cefrRange: "Below A2",
        descriptor: "Almost nothing communicated. Errors prevent all but occasional comprehension.",
        keyFeatures: ["Unintelligible throughout", "No grammar control"],
      },
      {
        band: 1, cefrRange: "A2",
        descriptor: "Basic vocabulary and simple structures only. Frequent errors, though some meaning is communicated.",
        keyFeatures: ["Very limited vocabulary", "Basic present/past only", "Frequent grammatical errors"],
      },
      {
        band: 2, cefrRange: "B1",
        descriptor: "Adequate vocabulary and simple structures; limited complex structures attempted. Errors present but meaning mostly clear.",
        keyFeatures: ["Adequate everyday vocabulary", "Some complex structures attempted", "Errors noticeable but not impeding"],
      },
      {
        band: 3, cefrRange: "B2",
        descriptor: "Good range of vocabulary and structures. Uses less common items. Errors occasional and minor.",
        keyFeatures: ["Good range, including less common items", "Complex structures used appropriately", "Minor errors only"],
      },
      {
        band: 4, cefrRange: "C1",
        descriptor: "Wide range of vocabulary and grammar used flexibly and with precision. Very few errors. Evidence of idiomatic usage.",
        keyFeatures: ["Wide, precise vocabulary", "Flexible complex structures", "Idiomatic language", "Rare errors"],
      },
      {
        band: 5, cefrRange: "C2",
        descriptor: "Exceptional range and control. Near-native precision in vocabulary and grammar. Effortless idiomatic usage.",
        keyFeatures: ["Near-native range", "Error-free or near-error-free", "Effortless idiomatic expression"],
      },
    ],
  },
  {
    criterion: "DISCOURSE_MANAGEMENT",
    label: "Discourse Management",
    weight: 0.25,
    focus: "Ability to produce extended stretches of language, maintain coherence, and manage the flow of discourse.",
    bands: [
      {
        band: 0, cefrRange: "Below A2",
        descriptor: "Unable to produce coherent utterances of more than single words/phrases.",
        keyFeatures: ["Only single words", "No discourse structure"],
      },
      {
        band: 1, cefrRange: "A2",
        descriptor: "Produces very short, isolated utterances. Little coherence between ideas. Long pauses and very limited connectors.",
        keyFeatures: ["Very short responses", "Isolated sentences", "Minimal linking"],
      },
      {
        band: 2, cefrRange: "B1",
        descriptor: "Produces mostly coherent responses but with some repetition, hesitation, or lack of development. Uses basic connectors.",
        keyFeatures: ["Generally coherent", "Some repetition/hesitation", "Basic connectors (and, but, so)"],
      },
      {
        band: 3, cefrRange: "B2",
        descriptor: "Maintains coherent discourse with appropriate development of ideas. Uses a range of connectors effectively.",
        keyFeatures: ["Well-developed ideas", "Range of connectors", "Maintains topic effectively"],
      },
      {
        band: 4, cefrRange: "C1",
        descriptor: "Produces fluent, well-organised discourse with sophisticated development. Uses a wide range of discourse markers naturally.",
        keyFeatures: ["Fluent and cohesive", "Sophisticated discourse structure", "Natural discourse markers"],
      },
      {
        band: 5, cefrRange: "C2",
        descriptor: "Exceptional discourse management. Effortless, natural flow. Masterful organisation and development of complex ideas.",
        keyFeatures: ["Effortless, natural discourse", "Masterful topic development", "Complex ideas cohesively organised"],
      },
    ],
  },
  {
    criterion: "PRONUNCIATION",
    label: "Pronunciation",
    weight: 0.25,
    focus: "Intelligibility: segmental accuracy (phonemes, word stress) and suprasegmental features (sentence stress, rhythm, intonation).",
    bands: [
      {
        band: 0, cefrRange: "Below A2",
        descriptor: "Pronunciation causes almost complete unintelligibility.",
        keyFeatures: ["Near-incomprehensible", "Consistent L1 interference"],
      },
      {
        band: 1, cefrRange: "A2",
        descriptor: "Pronunciation causes frequent misunderstandings. Strong L1 accent. Limited control of stress and intonation.",
        keyFeatures: ["Frequent intelligibility issues", "Strong accent interfering", "Word stress errors common"],
      },
      {
        band: 2, cefrRange: "B1",
        descriptor: "Generally intelligible despite a noticeable accent. Some errors in stress and intonation. Listener needs some effort.",
        keyFeatures: ["Generally intelligible", "Noticeable L1 accent", "Some stress/intonation errors"],
      },
      {
        band: 3, cefrRange: "B2",
        descriptor: "Clearly intelligible throughout. Mostly accurate stress and intonation. Accent does not impede communication.",
        keyFeatures: ["Easily intelligible", "Mostly correct stress", "Accent present but not impeding"],
      },
      {
        band: 4, cefrRange: "C1",
        descriptor: "Good control of phonemes, word stress, sentence stress, and intonation. Accent is slight and does not affect understanding.",
        keyFeatures: ["Good segmental and suprasegmental control", "Minimal accent", "Natural rhythm and intonation"],
      },
      {
        band: 5, cefrRange: "C2",
        descriptor: "Near-native pronunciation. Excellent phonemic accuracy. Suprasegmental features (rhythm, intonation) used expressively.",
        keyFeatures: ["Near-native pronunciation", "Expressive intonation", "Effortless intelligibility"],
      },
    ],
  },
  {
    criterion: "INTERACTIVE_COMMUNICATION",
    label: "Interactive Communication",
    weight: 0.25,
    focus: "Ability to take turns, initiate and respond to interaction, maintain and develop the conversation, and repair communication breakdowns.",
    bands: [
      {
        band: 0, cefrRange: "Below A2",
        descriptor: "Unable to participate in interaction. Does not respond or initiate.",
        keyFeatures: ["No interaction", "Cannot respond to prompts"],
      },
      {
        band: 1, cefrRange: "A2",
        descriptor: "Responds to direct questions with minimal contribution. Does not initiate or develop conversation.",
        keyFeatures: ["Responds only when prompted", "No initiative", "Very short turns"],
      },
      {
        band: 2, cefrRange: "B1",
        descriptor: "Maintains interaction in familiar situations. Takes turns with some hesitation. Limited initiation and repair strategies.",
        keyFeatures: ["Maintains basic interaction", "Takes turns with prompting", "Limited repair strategies"],
      },
      {
        band: 3, cefrRange: "B2",
        descriptor: "Interacts effectively. Takes turns naturally. Initiates and maintains discussion. Uses some repair and clarification strategies.",
        keyFeatures: ["Effective turn-taking", "Initiates appropriately", "Some repair strategies", "Maintains and develops discussion"],
      },
      {
        band: 4, cefrRange: "C1",
        descriptor: "Interacts fluently and naturally. Manages interaction skillfully. Uses a range of interactive strategies (inviting, checking, responding to cues).",
        keyFeatures: ["Fluent natural interaction", "Skilled turn management", "Range of interactive strategies"],
      },
      {
        band: 5, cefrRange: "C2",
        descriptor: "Expert interaction. Effortlessly initiates, maintains, and develops conversation. Full command of all interactive strategies.",
        keyFeatures: ["Expert interaction", "Effortless turn management", "Masterful repair and clarification"],
      },
    ],
  },
  {
    criterion: "GLOBAL_ACHIEVEMENT",
    label: "Global Achievement",
    weight: 0.0,   // Holistic overview — not added to score but included in report
    focus: "Overall communicative effectiveness across all four criteria. Holistic impression of the candidate's performance.",
    bands: [
      { band: 0, cefrRange: "Below A2", descriptor: "Unable to communicate at all.", keyFeatures: ["Communication completely fails"] },
      { band: 1, cefrRange: "A2",      descriptor: "Communicates only the most basic information in a very limited way.", keyFeatures: ["Very limited communicative success"] },
      { band: 2, cefrRange: "B1",      descriptor: "Communicates adequately in familiar situations with some difficulty.", keyFeatures: ["Adequate in familiar topics"] },
      { band: 3, cefrRange: "B2",      descriptor: "Communicates effectively across a range of situations with good accuracy.", keyFeatures: ["Effective across range of topics"] },
      { band: 4, cefrRange: "C1",      descriptor: "Communicates fluently and precisely across a wide range of demanding situations.", keyFeatures: ["Fluent and precise", "Handles complex topics"] },
      { band: 5, cefrRange: "C2",      descriptor: "Communicates with exceptional precision and fluency at near-native level.", keyFeatures: ["Near-native", "Effortless and sophisticated"] },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. SCORING ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export interface WritingMarkSchemeResult {
  content: number;                     // 0–5
  communicativeAchievement: number;    // 0–5
  organisation: number;                // 0–5
  language: number;                    // 0–5
  totalOutOf20: number;                // Sum of 4 criteria (max 20)
  scaledOutOf100: number;              // totalOutOf20 / 20 * 100
  cefrLevel: CefrLevel;
  grade: "DISTINCTION" | "MERIT" | "PASS" | "NARROW_FAIL" | "FAIL";
  criterionFeedback: Record<WritingCriterion, string>;
}

export interface SpeakingMarkSchemeResult {
  grammarVocabulary: number;          // 0–5
  discourseManagement: number;        // 0–5
  pronunciation: number;              // 0–5
  interactiveCommunication: number;   // 0–5
  globalAchievement: number;          // 0–5 (holistic)
  totalOutOf20: number;               // Sum of first 4 criteria (max 20)
  scaledOutOf100: number;
  cefrLevel: CefrLevel;
  grade: "DISTINCTION" | "MERIT" | "PASS" | "NARROW_FAIL" | "FAIL";
  criterionFeedback: Record<SpeakingCriterion, string>;
}

function bandToCefrLevel(band: number): CefrLevel {
  if (band <= 0) return "PRE_A1";
  if (band <= 1) return "A1";
  if (band <= 2) return "B1";
  if (band <= 3) return "B2";
  if (band <= 4) return "C1";
  return "C2";
}

function scoreToGrade(scaledPercent: number): WritingMarkSchemeResult["grade"] {
  if (scaledPercent >= 90) return "DISTINCTION";
  if (scaledPercent >= 80) return "MERIT";
  if (scaledPercent >= 60) return "PASS";
  if (scaledPercent >= 55) return "NARROW_FAIL";
  return "FAIL";
}

function getBandDescriptor(
  criterion: WritingCriterionSpec | SpeakingCriterionSpec,
  band: number
): string {
  const b = criterion.bands.find((d) => d.band === band);
  return b ? b.descriptor : "No descriptor available.";
}

/**
 * Compute the Cambridge writing mark scheme result from four criterion bands.
 */
export function computeWritingMarkScheme(bands: {
  content: 0 | 1 | 2 | 3 | 4 | 5;
  communicativeAchievement: 0 | 1 | 2 | 3 | 4 | 5;
  organisation: 0 | 1 | 2 | 3 | 4 | 5;
  language: 0 | 1 | 2 | 3 | 4 | 5;
}): WritingMarkSchemeResult {
  const total = bands.content + bands.communicativeAchievement + bands.organisation + bands.language;
  const scaledOutOf100 = Math.round((total / 20) * 100);
  const meanBand = total / 4;

  const criterionFeedback: Record<WritingCriterion, string> = {
    CONTENT: getBandDescriptor(CAMBRIDGE_WRITING_CRITERIA[0], bands.content),
    COMMUNICATIVE_ACHIEVEMENT: getBandDescriptor(CAMBRIDGE_WRITING_CRITERIA[1], bands.communicativeAchievement),
    ORGANISATION: getBandDescriptor(CAMBRIDGE_WRITING_CRITERIA[2], bands.organisation),
    LANGUAGE: getBandDescriptor(CAMBRIDGE_WRITING_CRITERIA[3], bands.language),
  };

  return {
    content: bands.content,
    communicativeAchievement: bands.communicativeAchievement,
    organisation: bands.organisation,
    language: bands.language,
    totalOutOf20: total,
    scaledOutOf100,
    cefrLevel: bandToCefrLevel(Math.round(meanBand)),
    grade: scoreToGrade(scaledOutOf100),
    criterionFeedback,
  };
}

/**
 * Compute the Cambridge speaking mark scheme result from five criterion bands.
 */
export function computeSpeakingMarkScheme(bands: {
  grammarVocabulary: 0 | 1 | 2 | 3 | 4 | 5;
  discourseManagement: 0 | 1 | 2 | 3 | 4 | 5;
  pronunciation: 0 | 1 | 2 | 3 | 4 | 5;
  interactiveCommunication: 0 | 1 | 2 | 3 | 4 | 5;
  globalAchievement: 0 | 1 | 2 | 3 | 4 | 5;
}): SpeakingMarkSchemeResult {
  // Only 4 criteria contribute to score (globalAchievement is holistic, not added)
  const total = bands.grammarVocabulary + bands.discourseManagement + bands.pronunciation + bands.interactiveCommunication;
  const scaledOutOf100 = Math.round((total / 20) * 100);
  const meanBand = total / 4;

  const criterionFeedback: Record<SpeakingCriterion, string> = {
    GRAMMAR_VOCABULARY: getBandDescriptor(CAMBRIDGE_SPEAKING_CRITERIA[0], bands.grammarVocabulary),
    DISCOURSE_MANAGEMENT: getBandDescriptor(CAMBRIDGE_SPEAKING_CRITERIA[1], bands.discourseManagement),
    PRONUNCIATION: getBandDescriptor(CAMBRIDGE_SPEAKING_CRITERIA[2], bands.pronunciation),
    INTERACTIVE_COMMUNICATION: getBandDescriptor(CAMBRIDGE_SPEAKING_CRITERIA[3], bands.interactiveCommunication),
    GLOBAL_ACHIEVEMENT: getBandDescriptor(CAMBRIDGE_SPEAKING_CRITERIA[4], bands.globalAchievement),
  };

  return {
    grammarVocabulary: bands.grammarVocabulary,
    discourseManagement: bands.discourseManagement,
    pronunciation: bands.pronunciation,
    interactiveCommunication: bands.interactiveCommunication,
    globalAchievement: bands.globalAchievement,
    totalOutOf20: total,
    scaledOutOf100,
    cefrLevel: bandToCefrLevel(Math.round(meanBand)),
    grade: scoreToGrade(scaledOutOf100),
    criterionFeedback,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. AI PROMPT RUBRIC ADAPTER
// Converts Cambridge criteria to structured AI scoring prompt
// ─────────────────────────────────────────────────────────────────────────────

export function buildCambridgeWritingPrompt(
  taskType: string,
  targetLevel: CefrLevel,
  responseText: string,
  promptText: string
): string {
  const criteriaBlock = CAMBRIDGE_WRITING_CRITERIA.map((c) => {
    const targetBand = levelToBand(targetLevel);
    const bandDesc = c.bands.find((b) => b.band === targetBand);
    return `**${c.label}** (0–5): Expected at ${targetLevel}: "${bandDesc?.descriptor ?? ""}"`;
  }).join("\n");

  return `You are a Cambridge Assessment English trained examiner marking a ${taskType} writing task.

Task prompt: """${promptText}"""

Candidate response: """${responseText}"""

Apply the Cambridge 4-criteria mark scheme. For each criterion, assign a band from 0–5:

${criteriaBlock}

Award the band that BEST describes the candidate's performance overall on each criterion — not just the response as a whole.

Respond in JSON:
{
  "content": <0|1|2|3|4|5>,
  "communicativeAchievement": <0|1|2|3|4|5>,
  "organisation": <0|1|2|3|4|5>,
  "language": <0|1|2|3|4|5>,
  "cefrLevel": "<PRE_A1|A1|A2|B1|B2|C1|C2>",
  "confidence": <0.0–1.0>,
  "justification": {
    "content": "<evidence from text>",
    "communicativeAchievement": "<evidence>",
    "organisation": "<evidence>",
    "language": "<specific errors and strengths>"
  },
  "corrections": [
    { "type": "grammar|vocabulary|spelling|punctuation", "original": "...", "suggestion": "...", "explanation": "..." }
  ]
}`;
}

export function buildCambridgeSpeakingPrompt(
  taskType: string,
  targetLevel: CefrLevel,
  transcript: string,
  durationSeconds?: number
): string {
  const criteriaBlock = CAMBRIDGE_SPEAKING_CRITERIA.map((c) => {
    const targetBand = levelToBand(targetLevel);
    const bandDesc = c.bands.find((b) => b.band === targetBand);
    return `**${c.label}** (0–5): Expected at ${targetLevel}: "${bandDesc?.descriptor ?? ""}"`;
  }).join("\n");

  return `You are a Cambridge Assessment English trained oral examiner marking a ${taskType} speaking task.
${durationSeconds ? `Duration: ${Math.round(durationSeconds)}s` : ""}

Candidate transcript: """${transcript}"""

Apply the Cambridge 5-criteria speaking mark scheme. For each criterion, assign a band from 0–5:

${criteriaBlock}

Respond in JSON:
{
  "grammarVocabulary": <0|1|2|3|4|5>,
  "discourseManagement": <0|1|2|3|4|5>,
  "pronunciation": <0|1|2|3|4|5>,
  "interactiveCommunication": <0|1|2|3|4|5>,
  "globalAchievement": <0|1|2|3|4|5>,
  "cefrLevel": "<PRE_A1|A1|A2|B1|B2|C1|C2>",
  "confidence": <0.0–1.0>,
  "justification": {
    "grammarVocabulary": "<specific grammatical features and vocabulary evidence>",
    "discourseManagement": "<discourse organisation evidence>",
    "pronunciation": "<phonemic and suprasegmental features>",
    "interactiveCommunication": "<turn-taking and interaction features>",
    "globalAchievement": "<overall holistic impression>"
  }
}`;
}

function levelToBand(level: CefrLevel): 0 | 1 | 2 | 3 | 4 | 5 {
  const map: Record<CefrLevel, 0 | 1 | 2 | 3 | 4 | 5> = {
    PRE_A1: 0, A1: 1, A2: 1, B1: 2, B2: 3, C1: 4, C2: 5,
  };
  return map[level];
}
