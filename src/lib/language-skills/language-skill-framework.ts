/**
 * LinguAdapt Language Skill Framework
 *
 * Single source of truth for all language ability knowledge in the platform.
 *
 * Theoretical basis:
 *  - Bachman & Palmer (2010) — Language Assessment in Practice
 *  - Council of Europe CEFR (2001, 2018 Companion Volume)
 *  - ALTE Can-Do Framework
 *  - Carroll (1968/1993) — Communicative Language Ability Model
 *  - Canale & Swain (1980) — Grammatical, Sociolinguistic, Discourse, Strategic competence
 *  - Bloom's Revised Taxonomy applied to language processing
 *  - ACTFL Proficiency Guidelines (2012)
 *  - Common European Framework — Plurilingual/pluricultural competence
 *
 * Covers: macro-skills, sub-competencies, cognitive levels, task types,
 * text genre taxonomy, functional language categories, integrated skill patterns.
 */

import type { CefrLevel } from "../cefr/cefr-framework.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. MACRO-SKILL DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

export type MacroSkill =
  | "READING"
  | "LISTENING"
  | "WRITING"
  | "SPEAKING"
  | "GRAMMAR"
  | "VOCABULARY";

export type Modality = "receptive" | "productive" | "interactive" | "structural";

export interface MacroSkillMeta {
  skill: MacroSkill;
  label: string;
  modality: Modality;
  subSkills: SubSkill[];
  cognitiveProcesses: CognitiveProcess[];
  primaryConstructs: string[];
  interactsWith: MacroSkill[];
}

export type SubSkill =
  // READING
  | "READING_GLOBAL_COMPREHENSION"    // Gist / main idea
  | "READING_DETAILED_COMPREHENSION"  // Specific information
  | "READING_INFERENTIAL"             // Reading between the lines
  | "READING_LEXICAL_IN_CONTEXT"      // Word meaning from context
  | "READING_COHESION_TRACKING"       // Reference, substitution
  | "READING_CRITICAL_EVALUATION"     // Author purpose, stance, register
  | "READING_SCANNING"                // Rapid search for target info
  | "READING_SKIMMING"                // Overview reading
  // LISTENING
  | "LISTENING_GLOBAL_COMPREHENSION"
  | "LISTENING_DETAILED_COMPREHENSION"
  | "LISTENING_INFERENTIAL"
  | "LISTENING_ATTITUDE_DETECTION"    // Speaker's tone, emotion, attitude
  | "LISTENING_SPECIFIC_INFO"         // Numbers, names, dates
  | "LISTENING_FUNCTIONAL_LANGUAGE"   // Greetings, requests, suggestions
  // WRITING
  | "WRITING_TASK_ACHIEVEMENT"        // Addressing all parts of the prompt
  | "WRITING_COHERENCE_COHESION"      // Logical flow, linking devices
  | "WRITING_LEXICAL_RESOURCE"        // Range, accuracy, collocation
  | "WRITING_GRAMMATICAL_RANGE"       // Complexity and accuracy of grammar
  | "WRITING_REGISTER"                // Formal/informal appropriacy
  | "WRITING_ARGUMENTATION"           // Logic, evidence, counter-argument
  | "WRITING_DESCRIPTION_NARRATION"   // Descriptive and narrative ability
  // SPEAKING
  | "SPEAKING_FLUENCY_COHERENCE"      // Natural flow, logical sequencing
  | "SPEAKING_LEXICAL_RESOURCE"
  | "SPEAKING_GRAMMATICAL_RANGE"
  | "SPEAKING_PRONUNCIATION"          // Segmental + suprasegmental
  | "SPEAKING_INTERACTION"            // Turn-taking, repair, clarification
  | "SPEAKING_EXTENDED_DISCOURSE"     // Sustained monologue
  // GRAMMAR
  | "GRAMMAR_VERB_TENSES"
  | "GRAMMAR_MODALITY"
  | "GRAMMAR_CONDITIONALS"
  | "GRAMMAR_PASSIVE_VOICE"
  | "GRAMMAR_RELATIVE_CLAUSES"
  | "GRAMMAR_REPORTED_SPEECH"
  | "GRAMMAR_CLAUSE_COMBINING"        // Coordination, subordination
  | "GRAMMAR_DETERMINERS_QUANTIFIERS"
  | "GRAMMAR_PREPOSITIONS"
  // VOCABULARY
  | "VOCABULARY_CORE_FREQUENCY"       // High-frequency word knowledge (BNC 1-3000)
  | "VOCABULARY_ACADEMIC_AWL"         // Academic Word List (Coxhead 2000)
  | "VOCABULARY_COLLOCATION"          // Typical partner words
  | "VOCABULARY_CONNOTATION"          // Positive/negative register
  | "VOCABULARY_WORD_FORMATION"       // Affixation, compounding
  | "VOCABULARY_PHRASAL_VERBS"
  | "VOCABULARY_IDIOMATIC";

export type CognitiveProcess =
  | "REMEMBER"      // Recall facts, recognize forms — Bloom L1
  | "UNDERSTAND"    // Paraphrase, explain, classify — Bloom L2
  | "APPLY"         // Use in new context — Bloom L3
  | "ANALYZE"       // Deconstruct, differentiate, compare — Bloom L4
  | "EVALUATE"      // Judge, critique, justify — Bloom L5
  | "CREATE";       // Compose, construct, generate — Bloom L6

export interface MacroSkillMeta {
  skill: MacroSkill;
  label: string;
  modality: Modality;
  subSkills: SubSkill[];
  cognitiveProcesses: CognitiveProcess[];
  primaryConstructs: string[];
  interactsWith: MacroSkill[];
}

export const MACRO_SKILLS: MacroSkillMeta[] = [
  {
    skill: "READING",
    label: "Reading Comprehension",
    modality: "receptive",
    subSkills: [
      "READING_GLOBAL_COMPREHENSION",
      "READING_DETAILED_COMPREHENSION",
      "READING_INFERENTIAL",
      "READING_LEXICAL_IN_CONTEXT",
      "READING_COHESION_TRACKING",
      "READING_CRITICAL_EVALUATION",
      "READING_SCANNING",
      "READING_SKIMMING",
    ],
    cognitiveProcesses: ["REMEMBER", "UNDERSTAND", "ANALYZE", "EVALUATE"],
    primaryConstructs: ["text comprehension", "discourse processing", "lexical access", "inferencing"],
    interactsWith: ["VOCABULARY", "GRAMMAR", "WRITING"],
  },
  {
    skill: "LISTENING",
    label: "Listening Comprehension",
    modality: "receptive",
    subSkills: [
      "LISTENING_GLOBAL_COMPREHENSION",
      "LISTENING_DETAILED_COMPREHENSION",
      "LISTENING_INFERENTIAL",
      "LISTENING_ATTITUDE_DETECTION",
      "LISTENING_SPECIFIC_INFO",
      "LISTENING_FUNCTIONAL_LANGUAGE",
    ],
    cognitiveProcesses: ["REMEMBER", "UNDERSTAND", "ANALYZE", "EVALUATE"],
    primaryConstructs: ["phonological decoding", "real-time parsing", "prosody interpretation", "pragmatic inference"],
    interactsWith: ["SPEAKING", "VOCABULARY", "GRAMMAR"],
  },
  {
    skill: "WRITING",
    label: "Writing Production",
    modality: "productive",
    subSkills: [
      "WRITING_TASK_ACHIEVEMENT",
      "WRITING_COHERENCE_COHESION",
      "WRITING_LEXICAL_RESOURCE",
      "WRITING_GRAMMATICAL_RANGE",
      "WRITING_REGISTER",
      "WRITING_ARGUMENTATION",
      "WRITING_DESCRIPTION_NARRATION",
    ],
    cognitiveProcesses: ["APPLY", "ANALYZE", "EVALUATE", "CREATE"],
    primaryConstructs: ["discourse organisation", "lexical sophistication", "grammatical accuracy", "pragmatic appropriacy"],
    interactsWith: ["READING", "GRAMMAR", "VOCABULARY"],
  },
  {
    skill: "SPEAKING",
    label: "Oral Production & Interaction",
    modality: "productive",
    subSkills: [
      "SPEAKING_FLUENCY_COHERENCE",
      "SPEAKING_LEXICAL_RESOURCE",
      "SPEAKING_GRAMMATICAL_RANGE",
      "SPEAKING_PRONUNCIATION",
      "SPEAKING_INTERACTION",
      "SPEAKING_EXTENDED_DISCOURSE",
    ],
    cognitiveProcesses: ["APPLY", "ANALYZE", "EVALUATE", "CREATE"],
    primaryConstructs: ["phonological accuracy", "fluency", "interactional competence", "strategic competence"],
    interactsWith: ["LISTENING", "GRAMMAR", "VOCABULARY"],
  },
  {
    skill: "GRAMMAR",
    label: "Grammatical Competence",
    modality: "structural",
    subSkills: [
      "GRAMMAR_VERB_TENSES",
      "GRAMMAR_MODALITY",
      "GRAMMAR_CONDITIONALS",
      "GRAMMAR_PASSIVE_VOICE",
      "GRAMMAR_RELATIVE_CLAUSES",
      "GRAMMAR_REPORTED_SPEECH",
      "GRAMMAR_CLAUSE_COMBINING",
      "GRAMMAR_DETERMINERS_QUANTIFIERS",
      "GRAMMAR_PREPOSITIONS",
    ],
    cognitiveProcesses: ["REMEMBER", "UNDERSTAND", "APPLY"],
    primaryConstructs: ["morpho-syntax", "clause structure", "grammatical accuracy", "complexity"],
    interactsWith: ["READING", "WRITING", "SPEAKING", "VOCABULARY"],
  },
  {
    skill: "VOCABULARY",
    label: "Lexical Competence",
    modality: "structural",
    subSkills: [
      "VOCABULARY_CORE_FREQUENCY",
      "VOCABULARY_ACADEMIC_AWL",
      "VOCABULARY_COLLOCATION",
      "VOCABULARY_CONNOTATION",
      "VOCABULARY_WORD_FORMATION",
      "VOCABULARY_PHRASAL_VERBS",
      "VOCABULARY_IDIOMATIC",
    ],
    cognitiveProcesses: ["REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE"],
    primaryConstructs: ["lexical breadth", "lexical depth", "lexical access speed", "collocation knowledge"],
    interactsWith: ["READING", "WRITING", "SPEAKING", "GRAMMAR"],
  },
];

export function getMacroSkillMeta(skill: MacroSkill): MacroSkillMeta {
  const meta = MACRO_SKILLS.find(m => m.skill === skill);
  if (!meta) throw new Error(`Unknown skill: ${skill}`);
  return meta;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. TEXT / DISCOURSE GENRE TAXONOMY
// ─────────────────────────────────────────────────────────────────────────────

export type TextGenre =
  | "NARRATIVE"           // Story, anecdote, recount
  | "EXPOSITORY"          // Informational, report
  | "ARGUMENTATIVE"       // Opinion, persuasive essay
  | "DESCRIPTIVE"         // Description of place/person/process
  | "PROCEDURAL"          // Instructions, how-to
  | "TRANSACTIONAL"       // Letters, emails, forms
  | "CONVERSATIONAL"      // Dialogue, interview
  | "ACADEMIC"            // Journal article, dissertation abstract
  | "NEWS"                // Newspaper article, headline
  | "LITERARY"            // Fiction, poetry
  | "FUNCTIONAL";         // Signs, labels, advertisements

export interface TextGenreMeta {
  genre: TextGenre;
  label: string;
  typicalRegister: string;
  cohesiveDevices: string[];
  levelRange: CefrLevel[];         // Levels where this genre commonly appears
  typicalWordCount: { min: number; max: number };
  cognitiveLoad: "low" | "medium" | "high";
}

export const TEXT_GENRES: TextGenreMeta[] = [
  {
    genre: "FUNCTIONAL",
    label: "Functional Text (Signs, Labels, Ads)",
    typicalRegister: "mixed",
    cohesiveDevices: ["enumeration", "headings"],
    levelRange: ["A1", "A2", "B1"],
    typicalWordCount: { min: 10, max: 80 },
    cognitiveLoad: "low",
  },
  {
    genre: "TRANSACTIONAL",
    label: "Transactional (Email, Letter, Form)",
    typicalRegister: "formal/informal",
    cohesiveDevices: ["greeting/closing", "salutation", "paragraph structure"],
    levelRange: ["A2", "B1", "B2"],
    typicalWordCount: { min: 80, max: 250 },
    cognitiveLoad: "medium",
  },
  {
    genre: "NARRATIVE",
    label: "Narrative",
    typicalRegister: "informal/literary",
    cohesiveDevices: ["time connectives", "anaphora", "chronological sequencing"],
    levelRange: ["A2", "B1", "B2", "C1"],
    typicalWordCount: { min: 100, max: 500 },
    cognitiveLoad: "medium",
  },
  {
    genre: "CONVERSATIONAL",
    label: "Dialogue / Conversation",
    typicalRegister: "informal",
    cohesiveDevices: ["turn-taking markers", "discourse markers", "ellipsis"],
    levelRange: ["A1", "A2", "B1", "B2"],
    typicalWordCount: { min: 50, max: 300 },
    cognitiveLoad: "low",
  },
  {
    genre: "DESCRIPTIVE",
    label: "Descriptive",
    typicalRegister: "neutral/formal",
    cohesiveDevices: ["spatial connectives", "relative clauses", "adjectival phrases"],
    levelRange: ["A2", "B1", "B2", "C1"],
    typicalWordCount: { min: 80, max: 400 },
    cognitiveLoad: "medium",
  },
  {
    genre: "EXPOSITORY",
    label: "Expository / Informational",
    typicalRegister: "formal/neutral",
    cohesiveDevices: ["logical connectives", "topic sentences", "paragraph structure"],
    levelRange: ["B1", "B2", "C1", "C2"],
    typicalWordCount: { min: 200, max: 700 },
    cognitiveLoad: "high",
  },
  {
    genre: "NEWS",
    label: "News Article",
    typicalRegister: "formal",
    cohesiveDevices: ["inverted pyramid", "attribution", "noun phrases"],
    levelRange: ["B1", "B2", "C1"],
    typicalWordCount: { min: 150, max: 500 },
    cognitiveLoad: "medium",
  },
  {
    genre: "ARGUMENTATIVE",
    label: "Argumentative / Opinion",
    typicalRegister: "formal",
    cohesiveDevices: ["thesis", "concession markers", "hedging", "reinforcement"],
    levelRange: ["B2", "C1", "C2"],
    typicalWordCount: { min: 250, max: 800 },
    cognitiveLoad: "high",
  },
  {
    genre: "ACADEMIC",
    label: "Academic Text",
    typicalRegister: "formal/academic",
    cohesiveDevices: ["in-text citations", "passive voice", "nominalisation", "hedging"],
    levelRange: ["C1", "C2"],
    typicalWordCount: { min: 300, max: 1000 },
    cognitiveLoad: "high",
  },
  {
    genre: "PROCEDURAL",
    label: "Procedural / Instructions",
    typicalRegister: "neutral",
    cohesiveDevices: ["numbered sequences", "imperative", "time/sequence markers"],
    levelRange: ["A2", "B1", "B2"],
    typicalWordCount: { min: 50, max: 300 },
    cognitiveLoad: "low",
  },
  {
    genre: "LITERARY",
    label: "Literary / Fiction",
    typicalRegister: "literary",
    cohesiveDevices: ["literary devices", "allusion", "symbolism"],
    levelRange: ["B2", "C1", "C2"],
    typicalWordCount: { min: 150, max: 600 },
    cognitiveLoad: "high",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. CEFR GRAMMAR SCOPE SEQUENCE (English Profile)
// ─────────────────────────────────────────────────────────────────────────────

export interface GrammaticalFeature {
  feature: string;
  level: CefrLevel;
  description: string;
  examples: string[];
}

export const GRAMMAR_SCOPE_SEQUENCE: GrammaticalFeature[] = [
  // A1
  { level: "A1", feature: "present_simple", description: "Simple present for habitual actions and states", examples: ["I work here.", "She is a teacher."] },
  { level: "A1", feature: "present_continuous", description: "Present progressive for current actions", examples: ["He is reading now."] },
  { level: "A1", feature: "simple_past_be", description: "Past of 'to be'", examples: ["I was tired."] },
  { level: "A1", feature: "basic_questions", description: "Yes/no and wh-questions with basic verbs", examples: ["Where do you live?"] },
  { level: "A1", feature: "countable_uncountable", description: "a / an / some / any", examples: ["a book", "some water"] },
  // A2
  { level: "A2", feature: "simple_past_regular", description: "Regular past tense", examples: ["She walked to school."] },
  { level: "A2", feature: "simple_past_irregular", description: "Common irregular past forms", examples: ["I went, saw, had"] },
  { level: "A2", feature: "future_going_to", description: "Plans with 'going to'", examples: ["I'm going to study tomorrow."] },
  { level: "A2", feature: "comparatives_superlatives", description: "Comparing with -er/-est, more/most", examples: ["bigger", "the most expensive"] },
  { level: "A2", feature: "modal_can_could_should", description: "Ability, possibility, advice", examples: ["You should see a doctor."] },
  // B1
  { level: "B1", feature: "present_perfect", description: "Present perfect for unspecified past", examples: ["I have seen it.", "She has just left."] },
  { level: "B1", feature: "past_continuous", description: "Past progressive for background events", examples: ["It was raining when I arrived."] },
  { level: "B1", feature: "future_will", description: "Predictions and decisions", examples: ["It will probably rain."] },
  { level: "B1", feature: "first_conditional", description: "Real conditions", examples: ["If it rains, I'll stay inside."] },
  { level: "B1", feature: "passive_present_past", description: "Simple passive", examples: ["The letter was sent."] },
  { level: "B1", feature: "relative_clauses_defining", description: "Defining relative clauses", examples: ["The man who left..."] },
  { level: "B1", feature: "reported_speech_statements", description: "Indirect statements", examples: ["She said she was tired."] },
  // B2
  { level: "B2", feature: "present_perfect_continuous", description: "Duration and recent activity", examples: ["I've been waiting for an hour."] },
  { level: "B2", feature: "second_conditional", description: "Hypothetical present/future", examples: ["If I were you, I'd apologise."] },
  { level: "B2", feature: "third_conditional", description: "Hypothetical past", examples: ["Had I known, I would have reacted differently."] },
  { level: "B2", feature: "non_defining_relative_clauses", description: "Extra information clauses", examples: ["My brother, who lives in Paris, is visiting."] },
  { level: "B2", feature: "passive_advanced", description: "Passive with modals and perfect", examples: ["It must have been done already."] },
  { level: "B2", feature: "inversion_formal", description: "Inversion for formal/literary effect", examples: ["Not only did he lie, but he also..."] },
  // C1
  { level: "C1", feature: "mixed_conditionals", description: "Mixed hypothetical time frames", examples: ["If I had studied, I would be an expert now."] },
  { level: "C1", feature: "cleft_sentences", description: "Focus and emphasis", examples: ["It was John who solved the problem."] },
  { level: "C1", feature: "subjunctive", description: "Formal recommendations and hypotheticals", examples: ["I suggest he be informed immediately."] },
  { level: "C1", feature: "complex_nominalisation", description: "Converting verb phrases to noun phrases", examples: ["the reduction of emissions"] },
  { level: "C1", feature: "ellipsis_substitution", description: "Economical reference", examples: ["Do you want to come? I'd love to."] },
  // C2
  { level: "C2", feature: "nuanced_modality", description: "Fine shades of meaning with modals", examples: ["He can't have been there — he would certainly have known."] },
  { level: "C2", feature: "archaic_formal_structures", description: "Structures from formal/literary registers", examples: ["Were he to arrive late, notify me."] },
  { level: "C2", feature: "register_flexibility", description: "Full control of register variation", examples: ["Shifting seamlessly between formal and colloquial"] },
];

export function getGrammarForLevel(level: CefrLevel): GrammaticalFeature[] {
  return GRAMMAR_SCOPE_SEQUENCE.filter(f => f.level === level);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. FUNCTIONAL LANGUAGE TAXONOMY
// ─────────────────────────────────────────────────────────────────────────────

export interface FunctionalCategory {
  function: string;
  level: CefrLevel;
  exampleExpressions: string[];
}

export const FUNCTIONAL_LANGUAGE: FunctionalCategory[] = [
  { level: "A1", function: "Greeting & Introducing", exampleExpressions: ["Hello, I'm…", "Nice to meet you."] },
  { level: "A1", function: "Asking for information", exampleExpressions: ["Where is…?", "What time is…?"] },
  { level: "A2", function: "Making suggestions", exampleExpressions: ["Why don't we…?", "Let's…", "How about…?"] },
  { level: "A2", function: "Expressing likes/dislikes", exampleExpressions: ["I really enjoy…", "I'm not keen on…"] },
  { level: "B1", function: "Expressing opinion", exampleExpressions: ["In my opinion…", "I think that…", "To my mind…"] },
  { level: "B1", function: "Agreeing/Disagreeing", exampleExpressions: ["That's a good point.", "I see your point, but…"] },
  { level: "B1", function: "Narrating events", exampleExpressions: ["First of all…", "After that…", "Eventually…"] },
  { level: "B2", function: "Hypothesising", exampleExpressions: ["Assuming that…", "Provided that…", "Even if…"] },
  { level: "B2", function: "Hedging and qualification", exampleExpressions: ["It seems to me that…", "To some extent…", "In a sense…"] },
  { level: "C1", function: "Arguing and persuading", exampleExpressions: ["On the contrary…", "One could argue that…", "It is worth noting that…"] },
  { level: "C1", function: "Showing complex stance", exampleExpressions: ["I would go so far as to say…", "While I concede that…"] },
  { level: "C2", function: "Nuanced discourse management", exampleExpressions: ["Let me put it another way…", "To be more precise…", "What I'm driving at is…"] },
];

// ─────────────────────────────────────────────────────────────────────────────
// 5. INTEGRATED SKILL TASK PATTERNS
// ─────────────────────────────────────────────────────────────────────────────

export interface IntegratedTaskPattern {
  id: string;
  name: string;
  inputSkill: MacroSkill;
  outputSkill: MacroSkill;
  description: string;
  levelRange: CefrLevel[];
  exampleFormats: string[];
}

export const INTEGRATED_TASK_PATTERNS: IntegratedTaskPattern[] = [
  {
    id: "read_respond_write",
    name: "Read-to-Write",
    inputSkill: "READING",
    outputSkill: "WRITING",
    description: "Candidate reads a stimulus text and produces a written response (e.g., email reply, summary, argument).",
    levelRange: ["B1", "B2", "C1", "C2"],
    exampleFormats: ["Formal email reply to a complaint letter", "Summary of an article in 100 words", "Discursive essay responding to a viewpoint"],
  },
  {
    id: "listen_respond_write",
    name: "Listen-to-Write",
    inputSkill: "LISTENING",
    outputSkill: "WRITING",
    description: "Candidate listens to a recording and produces notes or a short written response.",
    levelRange: ["B1", "B2", "C1"],
    exampleFormats: ["Notes from a lecture", "Summary of a meeting", "Written description of an announcement"],
  },
  {
    id: "read_discuss_speak",
    name: "Read-to-Speak",
    inputSkill: "READING",
    outputSkill: "SPEAKING",
    description: "Candidate reads a topic prompt or short text and delivers a spoken response.",
    levelRange: ["B1", "B2", "C1", "C2"],
    exampleFormats: ["Presentation on a given topic", "Monologue responding to arguments", "Persuasive speech"],
  },
  {
    id: "listen_respond_speak",
    name: "Listen-to-Speak",
    inputSkill: "LISTENING",
    outputSkill: "SPEAKING",
    description: "Candidate listens and responds in a simulated conversation or retelling task.",
    levelRange: ["A2", "B1", "B2"],
    exampleFormats: ["Simulated phone conversation", "Retelling a story heard", "Responding to recorded interview questions"],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 6. VOCABULARY LEVEL BANDS (based on Nation 2001, BNC frequency lists)
// ─────────────────────────────────────────────────────────────────────────────

export interface VocabBand {
  band: string;
  frequencyRank: { min: number; max: number };
  cefrCorrelation: CefrLevel[];
  description: string;
  sizeRequired: number; // approximate receptive vocabulary size needed
}

export const VOCAB_BANDS: VocabBand[] = [
  {
    band: "K1 (Most Frequent 1000)",
    frequencyRank: { min: 1, max: 1000 },
    cefrCorrelation: ["A1", "A2"],
    description: "Core everyday words. Must-knows for basic communication.",
    sizeRequired: 1000,
  },
  {
    band: "K2 (Frequent 1001-2000)",
    frequencyRank: { min: 1001, max: 2000 },
    cefrCorrelation: ["A2", "B1"],
    description: "Common conversational and general service vocabulary.",
    sizeRequired: 2000,
  },
  {
    band: "K3-K5 (Mid-Frequency 2001-5000)",
    frequencyRank: { min: 2001, max: 5000 },
    cefrCorrelation: ["B1", "B2"],
    description: "Words needed for varied communicative competence.",
    sizeRequired: 5000,
  },
  {
    band: "AWL (Academic Word List)",
    frequencyRank: { min: 0, max: 0 }, // not frequency-ranked
    cefrCorrelation: ["B2", "C1"],
    description: "570 word families appearing across academic disciplines. Essential for university study.",
    sizeRequired: 6000,
  },
  {
    band: "K6-K9 (Low-Frequency 5001-9000)",
    frequencyRank: { min: 5001, max: 9000 },
    cefrCorrelation: ["C1"],
    description: "Words appearing infrequently, requiring broad language exposure.",
    sizeRequired: 9000,
  },
  {
    band: "Specialised / Low-Frequency (9000+)",
    frequencyRank: { min: 9001, max: Infinity },
    cefrCorrelation: ["C2"],
    description: "Rare, domain-specific, or highly literary vocabulary.",
    sizeRequired: 15000,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 7. SKILL-LEVEL ABILITY DESCRIPTORS (CEFR × Skill matrix, CoE/ALTE 2018)
// ─────────────────────────────────────────────────────────────────────────────

export interface SkillLevelDescriptor {
  skill: MacroSkill;
  level: CefrLevel;
  descriptor: string;       // What the learner CAN do
  textComplexity: string;   // Type of text/input expected
  typicalErrors: string[];  // Common error patterns at this level
}

export const SKILL_LEVEL_DESCRIPTORS: SkillLevelDescriptor[] = [
  // READING
  { skill: "READING", level: "A1", descriptor: "Recognises familiar names, words, and simple sentences in notices. Understands short simple texts on familiar topics.", textComplexity: "Single sentences, very short texts, isolated labels", typicalErrors: ["misidentifying function words", "not recognising cognates"] },
  { skill: "READING", level: "A2", descriptor: "Reads short simple texts on concrete topics, finding predictable specific information in simple everyday materials.", textComplexity: "Short paragraphs, simple brochures, menus, timetables", typicalErrors: ["misreading pronouns", "difficulty with unfamiliar vocab in context"] },
  { skill: "READING", level: "B1", descriptor: "Reads uncomplicated factual texts on topics related to interests with satisfactory comprehension.", textComplexity: "Multi-paragraph texts, newspaper articles, simple reports", typicalErrors: ["failing to infer", "surface-level paraphrase errors"] },
  { skill: "READING", level: "B2", descriptor: "Reads with a large degree of independence, adapting style and speed to text type. Understands complex arguments in academic/professional texts.", textComplexity: "Extended texts, editorials, academic articles, literary prose", typicalErrors: ["missing hedged statements", "over-literal reading of figurative language"] },
  { skill: "READING", level: "C1", descriptor: "Understands in detail lengthy, complex texts, including discourse structure and implicit attitude.", textComplexity: "Dense analytical texts, research papers, literary criticism", typicalErrors: ["occasional ambiguity in meaning", "subtle irony misread"] },
  { skill: "READING", level: "C2", descriptor: "Reads and interprets virtually all forms of written language with ease, including abstract, structurally complex and linguistically subtle texts.", textComplexity: "Any authentic text including archaic or highly specialised content", typicalErrors: [] },
  // LISTENING
  { skill: "LISTENING", level: "A1", descriptor: "Understands familiar words and very basic phrases when people speak slowly and clearly.", textComplexity: "Very slow, clear speech; single statements; isolated words", typicalErrors: ["mishearing function words", "missing key content words"] },
  { skill: "LISTENING", level: "A2", descriptor: "Understands phrases and the highest frequency vocabulary related to areas of immediate personal relevance.", textComplexity: "Slow dialogues, simple announcements, short instructions", typicalErrors: ["making up missing words", "misinterpreting sentence stress"] },
  { skill: "LISTENING", level: "B1", descriptor: "Understands the main points of clear standard speech on familiar matters encountered in work, school, leisure.", textComplexity: "Authentic dialogues at near-normal speed, radio news, talks", typicalErrors: ["missing low-stress words", "confusion in rapid speech"] },
  { skill: "LISTENING", level: "B2", descriptor: "Understands extended speech and lectures, following complex argument. Understands most TV news and documentaries.", textComplexity: "Extended authentic speech, lectures, debates, interviews", typicalErrors: ["missing implicit connectives", "inferential gaps"] },
  { skill: "LISTENING", level: "C1", descriptor: "Understands extended speech even when not clearly structured, including idiomatic and colloquial register.", textComplexity: "Fast natural speech, complex lectures, idiomatic conversations", typicalErrors: ["occasional missed cultural references"] },
  { skill: "LISTENING", level: "C2", descriptor: "Has no difficulty understanding any kind of spoken language including rapid, highly colloquial speech.", textComplexity: "Any authentic audio, including overlapping speech and strong accents", typicalErrors: [] },
  // WRITING
  { skill: "WRITING", level: "A1", descriptor: "Writes simple isolated phrases and sentences about familiar topics. Can fill in forms with personal details.", textComplexity: "Simple sentence level, fixed phrases", typicalErrors: ["L1 transfer errors", "omitted articles", "no paragraph structure"] },
  { skill: "WRITING", level: "A2", descriptor: "Writes a series of simple phrases and sentences linked with simple connectors about experiences and immediate needs.", textComplexity: "Short messages, simple emails, postcards", typicalErrors: ["run-on sentences", "limited range of connectors", "spelling of high-frequency words"] },
  { skill: "WRITING", level: "B1", descriptor: "Writes straightforward connected text on familiar topics, producing simple personal letters describing experiences and impressions.", textComplexity: "Multi-paragraph personal writing, simple reports", typicalErrors: ["repetitive vocabulary", "weak paragraph transitions", "tense inconsistency"] },
  { skill: "WRITING", level: "B2", descriptor: "Writes clear detailed texts on a wide range of subjects, including argumentative and descriptive tasks showing effective control of form.", textComplexity: "Formal/informal letters, essays, reports, reviews", typicalErrors: ["hedging over/under-used", "some G/V inaccuracies in complex sentences"] },
  { skill: "WRITING", level: "C1", descriptor: "Writes well-structured, detailed texts on complex subjects, controlling organisational patterns, connectors, and cohesive devices effectively.", textComplexity: "Academic essays, formal reports, professional correspondence", typicalErrors: ["occasional awkwardness in very formal register", "minor L1 influence"] },
  { skill: "WRITING", level: "C2", descriptor: "Writes smooth, naturally flowing texts in an appropriate style, producing complex, nuanced arguments or narratives with full control.", textComplexity: "Any genre, including literary and highly academic writing", typicalErrors: [] },
  // SPEAKING
  { skill: "SPEAKING", level: "A1", descriptor: "Interacts in a simple way provided the other person speaks slowly and clearly and is prepared to help. Uses single words and memorised phrases.", textComplexity: "Very short utterances, isolated words", typicalErrors: ["long pauses", "pronunciation hindering comprehension", "formulaic speech only"] },
  { skill: "SPEAKING", level: "A2", descriptor: "Communicates in simple and routine tasks requiring a simple and direct exchange of information on familiar topics.", textComplexity: "Short sentences on familiar topics", typicalErrors: ["repetition", "reformulation difficulty", "limited connector use"] },
  { skill: "SPEAKING", level: "B1", descriptor: "Deals with most situations likely to arise when travelling. Enters unprepared into conversation on familiar topics.", textComplexity: "Multi-turn conversations on familiar subjects", typicalErrors: ["frequent pausing to search for words", "grammar errors in complex sentences", "L1 prosody interference"] },
  { skill: "SPEAKING", level: "B2", descriptor: "Interacts with a degree of fluency and spontaneity that makes regular interaction with native speakers possible without strain.", textComplexity: "Abstract topics, debates, extended explanations", typicalErrors: ["some unnatural pausing on abstract topics", "occasional miscollocation"] },
  { skill: "SPEAKING", level: "C1", descriptor: "Expresses ideas fluently and spontaneously without much obvious searching for expressions. Uses language flexibly and effectively.", textComplexity: "Complex social, academic, professional topics delivered with ease", typicalErrors: ["very occasional unnatural pausing", "near-native but not fully idiomatic in rare contexts"] },
  { skill: "SPEAKING", level: "C2", descriptor: "Takes part effortlessly in any conversation with a native speaker, including subtle expression of finer shades of meaning.", textComplexity: "Any topic, fully natural and idiomatic", typicalErrors: [] },
];

export function getSkillDescriptor(skill: MacroSkill, level: CefrLevel): SkillLevelDescriptor | undefined {
  return SKILL_LEVEL_DESCRIPTORS.find(d => d.skill === skill && d.level === level);
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. ASSESSMENT TASK SPECIFICATION PER SKILL × LEVEL
// ─────────────────────────────────────────────────────────────────────────────

export interface TaskSpec {
  skill: MacroSkill;
  level: CefrLevel;
  recommendedTaskTypes: string[];
  stimulusLength: { wordCountMin: number; wordCountMax: number } | { durationSecMin: number; durationSecMax: number };
  preferredGenres: TextGenre[];
  topicDomains: string[];
  responseFormat: string;
  rubricCriteria: string[];
}

export const TASK_SPECS: TaskSpec[] = [
  // READING
  { skill: "READING", level: "A1", recommendedTaskTypes: ["matching", "true_false"], stimulusLength: { wordCountMin: 10, wordCountMax: 60 }, preferredGenres: ["FUNCTIONAL", "CONVERSATIONAL"], topicDomains: ["personal identity", "home", "family", "numbers"], responseFormat: "single MCQ or T/F", rubricCriteria: ["word recognition", "simple fact retrieval"] },
  { skill: "READING", level: "A2", recommendedTaskTypes: ["MCQ", "matching", "gap-fill"], stimulusLength: { wordCountMin: 50, wordCountMax: 150 }, preferredGenres: ["TRANSACTIONAL", "FUNCTIONAL", "CONVERSATIONAL"], topicDomains: ["daily life", "shopping", "travel", "work"], responseFormat: "4-option MCQ or short answer", rubricCriteria: ["fact retrieval", "simple inference"] },
  { skill: "READING", level: "B1", recommendedTaskTypes: ["MCQ", "heading-matching", "gap-fill"], stimulusLength: { wordCountMin: 150, wordCountMax: 350 }, preferredGenres: ["NARRATIVE", "NEWS", "EXPOSITORY"], topicDomains: ["current events", "education", "health", "culture"], responseFormat: "4-option MCQ", rubricCriteria: ["main idea", "detail", "basic inference"] },
  { skill: "READING", level: "B2", recommendedTaskTypes: ["MCQ", "multiple-select", "sentence-insertion"], stimulusLength: { wordCountMin: 300, wordCountMax: 600 }, preferredGenres: ["EXPOSITORY", "ARGUMENTATIVE", "NEWS"], topicDomains: ["society", "environment", "technology", "business"], responseFormat: "4-option MCQ, complex matching", rubricCriteria: ["main idea", "inference", "cohesion", "author stance"] },
  { skill: "READING", level: "C1", recommendedTaskTypes: ["sentence-insertion", "MCQ", "gapped-text"], stimulusLength: { wordCountMin: 500, wordCountMax: 900 }, preferredGenres: ["ACADEMIC", "ARGUMENTATIVE", "LITERARY"], topicDomains: ["philosophy", "science", "arts", "economics"], responseFormat: "4-5 option, complex structure", rubricCriteria: ["complex inference", "discourse structure", "critical evaluation"] },
  { skill: "READING", level: "C2", recommendedTaskTypes: ["sentence-insertion", "critical-analysis-MCQ"], stimulusLength: { wordCountMin: 700, wordCountMax: 1200 }, preferredGenres: ["ACADEMIC", "LITERARY", "ARGUMENTATIVE"], topicDomains: ["any complex domain"], responseFormat: "Complex MCQ, in-text commentary", rubricCriteria: ["nuanced inference", "discourse tracking", "pragmatic competence"] },
  // WRITING
  { skill: "WRITING", level: "A1", recommendedTaskTypes: ["form-filling", "copy-complete"], stimulusLength: { wordCountMin: 0, wordCountMax: 20 }, preferredGenres: ["TRANSACTIONAL", "FUNCTIONAL"], topicDomains: ["personal info", "daily routine"], responseFormat: "20-40 word response", rubricCriteria: ["task completion", "basic grammar", "spelling"] },
  { skill: "WRITING", level: "A2", recommendedTaskTypes: ["short-message", "postcard", "simple-email"], stimulusLength: { wordCountMin: 20, wordCountMax: 80 }, preferredGenres: ["TRANSACTIONAL", "CONVERSATIONAL"], topicDomains: ["travel", "daily life", "invitations"], responseFormat: "40-80 words", rubricCriteria: ["task completion", "simple sentences", "basic connectors"] },
  { skill: "WRITING", level: "B1", recommendedTaskTypes: ["informal-email", "short-essay", "blog-post"], stimulusLength: { wordCountMin: 80, wordCountMax: 150 }, preferredGenres: ["TRANSACTIONAL", "NARRATIVE", "DESCRIPTIVE"], topicDomains: ["work", "study", "travel", "opinions"], responseFormat: "120-180 words", rubricCriteria: ["task achievement", "coherence", "range of vocabulary", "grammar accuracy"] },
  { skill: "WRITING", level: "B2", recommendedTaskTypes: ["formal-email", "report", "argumentative-essay", "review"], stimulusLength: { wordCountMin: 150, wordCountMax: 250 }, preferredGenres: ["TRANSACTIONAL", "ARGUMENTATIVE", "EXPOSITORY"], topicDomains: ["society", "work", "environment", "technology"], responseFormat: "200-250 words", rubricCriteria: ["task achievement", "coherence/cohesion", "lexical resource", "grammatical range & accuracy"] },
  { skill: "WRITING", level: "C1", recommendedTaskTypes: ["academic-essay", "formal-report", "proposal"], stimulusLength: { wordCountMin: 250, wordCountMax: 400 }, preferredGenres: ["ARGUMENTATIVE", "ACADEMIC", "EXPOSITORY"], topicDomains: ["complex academic/professional topics"], responseFormat: "300-400 words", rubricCriteria: ["critical argument", "sophisticated cohesion", "lexical precision", "structural variety"] },
  { skill: "WRITING", level: "C2", recommendedTaskTypes: ["thesis-level-essay", "literary-composition"], stimulusLength: { wordCountMin: 400, wordCountMax: 600 }, preferredGenres: ["ACADEMIC", "ARGUMENTATIVE", "LITERARY"], topicDomains: ["any domain at high sophistication"], responseFormat: "400-600 words", rubricCriteria: ["mastery of genre conventions", "stylistic variation", "complete accuracy"] },
  // SPEAKING
  { skill: "SPEAKING", level: "A1", recommendedTaskTypes: ["picture-description-simple", "personal-questions"], stimulusLength: { durationSecMin: 0, durationSecMax: 30 }, preferredGenres: ["CONVERSATIONAL"], topicDomains: ["self", "family", "school"], responseFormat: "< 30 second response", rubricCriteria: ["intelligibility", "basic vocabulary", "simple phrases"] },
  { skill: "SPEAKING", level: "A2", recommendedTaskTypes: ["guided-interview", "picture-sequence"], stimulusLength: { durationSecMin: 20, durationSecMax: 60 }, preferredGenres: ["CONVERSATIONAL", "NARRATIVE"], topicDomains: ["daily life", "leisure", "travel"], responseFormat: "30-60 second response", rubricCriteria: ["fluency", "simple structures", "pronunciation"] },
  { skill: "SPEAKING", level: "B1", recommendedTaskTypes: ["monologue", "opinion-giving", "situation-explaining"], stimulusLength: { durationSecMin: 60, durationSecMax: 120 }, preferredGenres: ["NARRATIVE", "EXPOSITORY"], topicDomains: ["work", "education", "culture", "current events"], responseFormat: "60-120 seconds", rubricCriteria: ["fluency & coherence", "vocabulary", "grammar", "pronunciation"] },
  { skill: "SPEAKING", level: "B2", recommendedTaskTypes: ["extended-monologue", "argument-development", "discuss-abstract-topic"], stimulusLength: { durationSecMin: 90, durationSecMax: 180 }, preferredGenres: ["ARGUMENTATIVE", "EXPOSITORY"], topicDomains: ["complex social and professional topics"], responseFormat: "90-180 seconds", rubricCriteria: ["fluency", "lexical range", "grammatical range", "pronunciation", "discourse management"] },
  { skill: "SPEAKING", level: "C1", recommendedTaskTypes: ["academic-discussion", "critical-evaluation", "presentation-fragment"], stimulusLength: { durationSecMin: 120, durationSecMax: 240 }, preferredGenres: ["ACADEMIC", "ARGUMENTATIVE"], topicDomains: ["academic, professional, abstract"], responseFormat: "2-4 minutes", rubricCriteria: ["sophisticated fluency", "precise vocabulary", "complex grammar", "prosody", "pragmatic competence"] },
  { skill: "SPEAKING", level: "C2", recommendedTaskTypes: ["freestyle-discourse", "nuanced-debate"], stimulusLength: { durationSecMin: 180, durationSecMax: 360 }, preferredGenres: ["ACADEMIC", "LITERARY", "ARGUMENTATIVE"], topicDomains: ["any domain"], responseFormat: "3-6 minutes", rubricCriteria: ["native-like fluency", "stylistic range", "complete accuracy", "cultural competence"] },
];

export function getTaskSpec(skill: MacroSkill, level: CefrLevel): TaskSpec | undefined {
  return TASK_SPECS.find(t => t.skill === skill && t.level === level);
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. SKILL INTERACTION ANALYSIS — for comprehensive score reporting
// ─────────────────────────────────────────────────────────────────────────────

export interface SkillInteractionInsight {
  skill: MacroSkill;
  relatedSkill: MacroSkill;
  relationshipType: "enabling" | "supporting" | "integrating";
  implication: string;
}

export const SKILL_INTERACTIONS: SkillInteractionInsight[] = [
  { skill: "GRAMMAR", relatedSkill: "WRITING", relationshipType: "enabling", implication: "Grammatical accuracy directly constrains writing quality; grammar weaknesses appear as persistent structural errors in writing." },
  { skill: "VOCABULARY", relatedSkill: "READING", relationshipType: "enabling", implication: "95% text coverage (Nation 2001) is required for comprehension; vocabulary gaps directly impair reading performance." },
  { skill: "LISTENING", relatedSkill: "SPEAKING", relationshipType: "supporting", implication: "Listening ability supports oral interaction; candidates with low listening often show poor interactional competence in speaking tasks." },
  { skill: "READING", relatedSkill: "WRITING", relationshipType: "integrating", implication: "Reading models for writing; candidates exposed to extensive reading develop superior writing discourse organisation." },
  { skill: "GRAMMAR", relatedSkill: "SPEAKING", relationshipType: "enabling", implication: "Grammar inaccuracies appear as fluency disruptions in speaking; self-correction loops reduce speaking rate." },
  { skill: "VOCABULARY", relatedSkill: "WRITING", relationshipType: "supporting", implication: "Lexical resource is a key IELTS/CEFR criterion for writing; vocabulary breadth predicts essay band independently." },
];

// ─────────────────────────────────────────────────────────────────────────────
// 10. BUILD SKILL-AWARE FEEDBACK PROMPT ADDENDUM (for Gemini AI scoring)
// ─────────────────────────────────────────────────────────────────────────────

export function buildSkillAwarePromptAddendum(skill: MacroSkill, level: CefrLevel): string {
  const descriptor = getSkillDescriptor(skill, level);
  const taskSpec = getTaskSpec(skill, level);
  const meta = getMacroSkillMeta(skill);

  const lines: string[] = [
    `\n───── SKILL EXPERTISE: ${skill} @ CEFR ${level} ─────`,
    `Sub-skills to assess: ${meta.subSkills.join(", ")}`,
    `Cognitive processes: ${meta.cognitiveProcesses.join(", ")}`,
  ];

  if (descriptor) {
    lines.push(`Expected performance descriptor: "${descriptor.descriptor}"`);
    if (descriptor.typicalErrors.length > 0) {
      lines.push(`Typical error patterns at this level: ${descriptor.typicalErrors.join("; ")}`);
    }
  }

  if (taskSpec) {
    lines.push(`Response rubric criteria: ${taskSpec.rubricCriteria.join(", ")}`);
  }

  lines.push(`Primary constructs to evaluate: ${meta.primaryConstructs.join(", ")}`);
  lines.push(`─────────────────────────────────────────────────────────────\n`);

  return lines.join("\n");
}
