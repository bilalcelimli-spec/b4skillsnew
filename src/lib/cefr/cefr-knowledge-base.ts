/**
 * LinguAdapt CEFR Knowledge Base
 *
 * The deep AI engine reference: everything the item generator, scorer, and
 * report engine need to understand about CEFR at an expert psychometrician level.
 *
 * Sources:
 *  - Council of Europe CEFR (2001) + Companion Volume (2018)
 *  - English Profile Programme — Cambridge University Press
 *  - Nation (2001, 2006) — Vocabulary frequency bands
 *  - New General Service List (NGSL, Browne et al. 2013)
 *  - Academic Word List (Coxhead 2000) + Oxford 3000 / 5000
 *  - Quirk et al. (1985) — A Comprehensive Grammar of the English Language
 *  - Biber (1988) — Variation across Speech and Writing (register, complexity)
 *  - Weir (2005) — Language Testing and Validation
 *  - ALTE (2011) — Manual for Language Test Development and Examining
 *  - Cai & Leung (2016) — Discourse complexity in EFL learner corpora
 */

import type { CefrLevel } from "./cefr-framework.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. GRAMMAR INVENTORY PER CEFR LEVEL
//    Based on English Profile Programme's empirical corpus of learner English.
//    Each entry: structure → expected productive or receptive mastery.
// ─────────────────────────────────────────────────────────────────────────────

export interface GrammarFeature {
  feature: string;
  description: string;
  exampleStem?: string;     // Example test-item sentence
  commonErrors?: string[];  // Typical learner errors at this level (distractor fodder)
}

export interface GrammarInventory {
  level: CefrLevel;
  /** Structures expected to be used accurately in production */
  productive: GrammarFeature[];
  /** Structures that can be recognised/decoded but not yet produced accurately */
  receptive: GrammarFeature[];
  /** Structures explicitly out of scope for this level */
  notYet: string[];
}

export const GRAMMAR_INVENTORY: Record<CefrLevel, GrammarInventory> = {
  PRE_A1: {
    level: "PRE_A1",
    productive: [
      { feature: "to be (am/is/are)", description: "Present simple of 'be' in affirmative", exampleStem: "I ___ a student.", commonErrors: ["am not → is not", "omission"] },
      { feature: "Singular/plural nouns", description: "Regular plural -s", exampleStem: "one cat / two ___", commonErrors: ["mouses", "childs"] },
      { feature: "Personal pronouns (I, you, he, she)", description: "Subject pronouns", exampleStem: "___ is my friend. (Tom)", commonErrors: ["She instead of He (L1 gender confusion)", "Him goes (object pronoun as subject)"] },
      { feature: "Basic articles (a, the)", description: "Indefinite a, definite the in formulaic phrases", commonErrors: ["a apple", "omit 'the'"] },
      { feature: "Numbers 1–20", description: "Cardinal numbers", exampleStem: "___ + five = ten" },
      { feature: "Colours and basic adjectives", description: "Predicative use: The car is red.", exampleStem: "The ball ___ blue.", commonErrors: ["The ball blue"] },
    ],
    receptive: [
      { feature: "Imperative (Stand up! Sit down!)", description: "Classroom instruction imperatives" },
      { feature: "have got", description: "Possession in simple context" },
    ],
    notYet: ["Past simple", "Modal verbs", "Comparatives", "Relative clauses", "Conditionals"],
  },

  A1: {
    level: "A1",
    productive: [
      { feature: "Present simple", description: "Third-person -s, negation, questions", exampleStem: "She ___ (not play) tennis.", commonErrors: ["She play", "She don't plays", "Does she plays?"] },
      { feature: "Present continuous", description: "Action at moment of speaking", exampleStem: "They ___ (watch) TV now.", commonErrors: ["They watching", "They are watch"] },
      { feature: "Past simple (regular)", description: "-ed forms, did + base", exampleStem: "He ___ (walk) to school yesterday.", commonErrors: ["He walk", "He did walked"] },
      { feature: "have/has (possession)", description: "Simple possession statements", exampleStem: "She ___ two brothers.", commonErrors: ["She have", "She is have"] },
      { feature: "can / can't", description: "Ability in present", exampleStem: "I ___ swim but I can't fly.", commonErrors: ["I cans", "I can to swim"] },
      { feature: "There is / there are", description: "Existence statements", exampleStem: "___ a dog in the garden.", commonErrors: ["There is dogs", "It is a dog"] },
      { feature: "Possessive adjectives (my, your, his, her, our, their)", description: "Basic possessives", exampleStem: "___ name is Maria.", commonErrors: ["Her name are", "Hers name"] },
      { feature: "Question words (What, Where, When, Who)", description: "Basic interrogatives", exampleStem: "___ do you live?", commonErrors: ["Where you live?", "What you name?"] },
      { feature: "Prepositions of place (in, on, at, next to, behind)", description: "Location description", exampleStem: "The book is ___ the table.", commonErrors: ["on/in confusion", "in front of vs front of confusion"] },
      { feature: "Demonstratives (this, that, these, those)", description: "Deictic reference", commonErrors: ["this cars", "those book"] },
    ],
    receptive: [
      { feature: "Going to (plans)", description: "Near future plans" },
      { feature: "Past simple (irregular)", description: "High-frequency irregular verbs: went, came, said" },
      { feature: "Object pronouns (me, him, her, us, them)", description: "Object position" },
    ],
    notYet: ["Present perfect", "Past continuous", "Second conditional", "Passive voice", "Relative clauses", "Reported speech", "Modal perfects"],
  },

  A2: {
    level: "A2",
    productive: [
      { feature: "Present perfect (ever/never, just, already, yet)", description: "Experience and recent events", exampleStem: "Have you ___ (visit) Paris?", commonErrors: ["Did you ever visited?", "I have visit", "I have went"] },
      { feature: "Past simple (irregular verbs)", description: "High-frequency irregular forms", exampleStem: "She ___ (buy) a new phone.", commonErrors: ["She buyed", "She boughted"] },
      { feature: "Going to (future plans)", description: "Intention and plans", exampleStem: "They ___ (build) a new school next year.", commonErrors: ["They are going build", "They will going to"] },
      { feature: "Will (future spontaneous decision / prediction)", description: "Offers and predictions", exampleStem: "I think it ___ rain tomorrow.", commonErrors: ["I think it will raining", "I think it is rain"] },
      { feature: "Comparative adjectives", description: "Regular and irregular: bigger, more expensive", exampleStem: "London is ___ than my city. (big)", commonErrors: ["more bigger", "biger", "London is bigger as"] },
      { feature: "Superlative adjectives", description: "the biggest, the most beautiful", exampleStem: "It is the ___ city in the world. (large)", commonErrors: ["most large", "largest of the world", "the more large"] },
      { feature: "Countable / uncountable nouns", description: "Some, any, much, many, a lot of, a few, a little", exampleStem: "There isn't ___ sugar left. (much/many)", commonErrors: ["many sugar", "a few water", "much books"] },
      { feature: "Modal verbs (should, must, mustn't, have to)", description: "Obligation, advice, prohibition", exampleStem: "You ___ wear a seatbelt. It's the law. (must/have to)", commonErrors: ["must to wear", "you should to", "mustn't = don't have to"] },
      { feature: "Past continuous", description: "Background action with past simple", exampleStem: "When he arrived, she ___ (cook).", commonErrors: ["she cooked (missing progressive aspect)", "she was cook (omitting -ing)"] },
      { feature: "Relative clauses (who, which, that)", description: "Defining relative clauses only", exampleStem: "The man ___ lives next door is a doctor.", commonErrors: ["The man who he lives (doubled subject)", "The man which (wrong pronoun for person)", "The man lives (omitting relative pronoun)"] },
      { feature: "First conditional (if + present simple, will)", description: "Real conditions", exampleStem: "If it ___ tomorrow, we ___ stay inside. (rain/will)", commonErrors: ["If it will rain", "we will stayed", "we stay"] },
      { feature: "Adverbs of frequency", description: "always, usually, often, sometimes, rarely, never", exampleStem: "She ___ goes to bed before midnight. (always)", commonErrors: ["She goes always", "She always is going"] },
    ],
    receptive: [
      { feature: "Second conditional (if + past simple, would)", description: "Hypothetical present/future" },
      { feature: "Passive voice (present + past simple)", description: "Simple passive recognition" },
      { feature: "Used to", description: "Past habit and state" },
      { feature: "Be going to vs. will distinction", description: "Plan vs. prediction nuance" },
    ],
    notYet: ["Third conditional", "Mixed conditionals", "Subjunctive", "Cleft sentences", "Inversion", "Modal perfects (should have done)", "Complex passive", "Participle clauses"],
  },

  B1: {
    level: "B1",
    productive: [
      { feature: "Present perfect continuous", description: "Duration of activity up to now", exampleStem: "She ___ (study) English for three years.", commonErrors: ["She has been study", "She has studying", "She studied for 3 years (wrong tense)"] },
      { feature: "Past perfect", description: "Sequencing past events", exampleStem: "When we arrived, the film ___. (already start)", commonErrors: ["already started (omitting had)", "The film had already started is correct; learners drop the had"] },
      { feature: "Second conditional", description: "Hypothetical present/future situations", exampleStem: "If I ___ more time, I ___ travel more.", commonErrors: ["If I would have more time (would in if-clause)", "I would travelled (past participle in main clause)"] },
      { feature: "Passive voice (simple and continuous tenses)", description: "Shifting focus from agent to action", exampleStem: "The report ___ (write) by the team last month.", commonErrors: ["was writed (wrong past participle)", "omitting by when agent should be expressed"] },
      { feature: "Reported speech (statements, questions, commands)", description: "Backshift in reporting", exampleStem: "She said she ___ tired. (be)", commonErrors: ["She said she is tired (no backshift applied)", "She told that she was tired (omitting me/him/her after told)"] },
      { feature: "Modal verbs (could, might, may for possibility; would for politeness)", description: "Nuanced modality", exampleStem: "It ___ rain later — the clouds look dark. (could/might)", commonErrors: ["could be rain (missing -ing)", "It can rain (can = ability, not possibility here)"] },
      { feature: "Relative clauses (where, whose, when)", description: "Expanded relative clause range", exampleStem: "The town ___ I grew up has changed a lot.", commonErrors: ["The town where I grew up it has (doubled subject)", "The town in which I grew up (too formal for B1 production)"] },
      { feature: "Gerunds vs. infinitives (common verbs)", description: "Stop/try/like etc. + gerund or infinitive", exampleStem: "She stopped ___ (smoke).", commonErrors: ["stopped to smoke (meaning change)", "stopped smoke"] },
      { feature: "Used to / would (past habits)", description: "Distinguishing habitual past from simple past", exampleStem: "When I was young, I ___ (used to/would) walk to school.", commonErrors: ["I used to walked", "I would am", "I was used to walk"] },
      { feature: "Quantifiers (both, all, neither, each, every)", description: "Precise quantification", exampleStem: "___ of the students passed the exam. (All/Both/Neither)", commonErrors: ["All of students (missing the)", "Both students (missing of with pronoun: Both of them)", "Neither…nor misused as Neither…or"] },
      { feature: "Wish + past simple / would (present regret)", description: "Expressing wishes and regrets", exampleStem: "I wish I ___ taller. (be)", commonErrors: ["I wish I was (acceptable in informal, were is formal)", "I wish I am (present tense after wish)", "I hope I were (confusing wish and hope)"] },
    ],
    receptive: [
      { feature: "Third conditional (if + past perfect, would have)", description: "Unreal past conditions" },
      { feature: "Reduced relative clauses (the man standing…)", description: "Participial phrases as modifiers" },
      { feature: "As long as / provided that / unless (conditionals)", description: "Alternative conditional connectors" },
      { feature: "Cleft sentences (It is… who…)", description: "Basic cleft for emphasis recognition" },
      { feature: "Despite / although / in spite of", description: "Concession in complex sentences" },
    ],
    notYet: ["Subjunctive mood (formal: I suggest he go)", "Complex inversion (Never have I seen)", "Nominalisations (realisation, development)", "Participle clauses replacing subordinate clauses", "Double passives", "Modal perfect range (should have, ought to have, needn't have)"],
  },

  B2: {
    level: "B2",
    productive: [
      { feature: "Third conditional", description: "Hypothetical past situations and their consequences", exampleStem: "If she ___ harder, she ___ the exam. (study / pass)", commonErrors: ["If she studied harder, she would passed (missing have)", "would have studied in the if-clause (would invades the if-clause)"] },
      { feature: "Mixed conditionals", description: "Combining 2nd and 3rd conditional", exampleStem: "If I ___ (be) more organised, I ___ (not miss) the deadline yesterday.", commonErrors: ["Incorrect tense sequencing", "using 3rd cond structure throughout"] },
      { feature: "Passive voice (all tenses + modal passives)", description: "Sophisticated use of passive for register and focus", exampleStem: "The issue ___ (address) by the committee before the report ___ (submit).", commonErrors: ["was been addressed (double passive auxiliary)", "omitting the agent when it adds important information"] },
      { feature: "Modal perfects (should/must/can't have + pp)", description: "Deduction and criticism about past", exampleStem: "He looks exhausted — he ___ been working all night.", commonErrors: ["must be working", "must to have worked", "should have been work"] },
      { feature: "Cleft sentences (It was…, What…is)", description: "Emphasis through clefting", exampleStem: "___ I need is a holiday. (What)", commonErrors: ["What I need it is", "It was her who she told me", "What I need are"] },
      { feature: "Nominalisations (verb to noun transformation)", description: "Academic register", exampleStem: "The ___ of the new policy surprised analysts. (introduce)", commonErrors: ["introducing of (gerund used instead of nominalisation)", "introducment (invented form)"] },
      { feature: "Inversion after negative adverbials (Never, Rarely, Seldom, Not only)", description: "Formal/literary emphasis", exampleStem: "Never ___ such a discovery been made in this field. (have)", commonErrors: ["Never such a discovery has been", "Never have such"] },
      { feature: "Subjunctive (formal: I suggest / recommend / insist that)", description: "Formal suggestion and recommendation", exampleStem: "The committee recommended that she ___ (be) appointed immediately.", commonErrors: ["she should be (acceptable alternative but less formal)", "she was (past tense not bare infinitive)", "she is (present tense after formal verb of recommending)"] },
      { feature: "Participle clauses (Arriving late, he)", description: "Compressed subordination", exampleStem: "___ the report, she noticed several errors. (read: Having read)", commonErrors: ["Having reading (wrong -ing form after having)", "dangling participle: Reading the report, errors were noticed"] },
      { feature: "Discourse connectors (furthermore, nevertheless, notwithstanding, whereas)", description: "Sophisticated text cohesion", exampleStem: "The experiment was successful; ___, the sample size was limited.", commonErrors: ["however (acceptable but less precisely matched to context)", "nevertheless misplaced at end of clause", "Notwithstanding used without an object noun phrase"] },
    ],
    receptive: [
      { feature: "Concessive participle clauses (Although being / Despite having)", description: "Compressed concession" },
      { feature: "Double object constructions with passives (He was given…)", description: "Complex passive" },
      { feature: "Free indirect speech", description: "Narrative technique blending narrator and character voice" },
      { feature: "Pseudo-cleft (What they found was…)", description: "Emphatic theme-rheme" },
    ],
    notYet: ["Complex garden-path sentences", "Full subjunctive range in formal writing", "Absolute clauses", "Verb complementation patterns (verbs taking that-clauses without 'that')", "Fronted focus (Rarely does one encounter…) — recognition only"],
  },

  C1: {
    level: "C1",
    productive: [
      { feature: "Complex nominalisations + abstract nouns", description: "High-density academic prose", exampleStem: "The ___ of climate change continues to generate debate. (manifestation / implementation)", commonErrors: ["Inappropriate register (using verbs where nouns expected)", "Incorrect prepositional collocations (manifestation at rather than of)"] },
      { feature: "Absolute clauses", description: "Participial phrase with own subject", exampleStem: "___ completed, the project was submitted. (The deadline / Work having been)", commonErrors: ["Dangling participle errors", "Missing auxiliary in perfect absolute"] },
      { feature: "Fronting and inversion for emphasis (formal)", description: "Topic-fronting, negative inversion", exampleStem: "___ that aspect of the theory which most scholars find problematic. (It is)", commonErrors: ["Omitting inversion after negative adverbs", "Confusing It is X that... with It is X which..."] },
      { feature: "Complex conditional and concessive chains", description: "Multi-clause conditional + concessive", exampleStem: "Even if the results ___ been different, the methodology ___ still (be) questioned.", commonErrors: ["Inconsistent hypothetical tense sequence", "Mixing even if (open) with even though (factual)"] },
      { feature: "Register-appropriate modal selection", description: "Epistemic vs. deontic modality; hedging strategies", exampleStem: "The evidence ___ suggest that… / This ___ be attributed to…", commonErrors: ["Underuse of hedging", "may/might confusion in academic writing"] },
      { feature: "Full range of relative clauses (non-defining, reduced, sentential)", description: "Complex relative clause types", exampleStem: "The findings, ___ were surprising, challenged the existing paradigm. (which)", commonErrors: ["Missing comma before non-defining relative clause", "Using that in non-defining clauses (which only)"] },
      { feature: "Ellipsis and substitution", description: "Textual economy — do so, the former/latter", exampleStem: "She submitted early; many others failed to ___.", commonErrors: ["Over-repetition (ellipsis not applied)", "do so vs do it confusion"] },
      { feature: "Complex prepositional phrases and postmodification", description: "Dense noun phrase structure", exampleStem: "The decision ___ in the context ___ the crisis was controversial.", commonErrors: ["Preposition choice errors", "Noun phrase overload in speech"] },
    ],
    receptive: [
      { feature: "Rare subjunctive (were he to / had she known)", description: "Literary / formal conditional inversion" },
      { feature: "Metalinguistic hedges (so to speak, as it were, strictly speaking)", description: "Speaker stance marking" },
      { feature: "Apposition and summative relative (which means that…)", description: "Discourse summarising devices" },
      { feature: "Asyndetic coordination in literary prose", description: "Coordination without conjunctions" },
    ],
    notYet: ["Highly specialised technical registers", "Archaic subjunctive (The king be praised)", "Ancient grammar patterns in literary canon study"],
  },

  C2: {
    level: "C2",
    productive: [
      { feature: "Full mastery of all C1 structures with stylistic choice", description: "Choosing among alternatives for rhetorical effect", exampleStem: "Distinguish register-appropriate uses of: 'it is alleged that' vs 'apparently' vs 'allegedly'.", commonErrors: ["Overusing formal structures in casual register", "Failing to exploit stylistic variation"] },
      { feature: "Metalinguistic commentary", description: "Commenting on language itself in academic or critical writing", exampleStem: "The use of the passive here ___ (serve) to foreground the action rather than the agent.", commonErrors: ["Collapsing object language and meta-language"] },
      { feature: "Archaic and poetic forms", description: "Understanding / using wh-inversion, subjunctive in literary analysis", exampleStem: "Were he to accept the premise…", },
      { feature: "Full pragmatic and discourse competence", description: "All hedges, stance markers, implicature management", exampleStem: "With all due respect, the argument ___ be seen as somewhat tendentious. (might)", },
      { feature: "Cross-register code-switching", description: "Moving fluidly between formal, informal, academic, colloquial within a text for effect", },
    ],
    receptive: [
      { feature: "All grammatical forms in all registers", description: "No productive–receptive distinction at this level: full command" },
    ],
    notYet: [],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. VOCABULARY BANDS
//    Nation (2001) frequency lists, Oxford 3000/5000, NGSL, AWL, Zipf scale.
// ─────────────────────────────────────────────────────────────────────────────

export interface VocabularyBand {
  level: CefrLevel;
  /** Approximate word family count in productive vocabulary */
  productiveWordFamilies: number;
  /** Approximate word family count in receptive vocabulary */
  receptiveWordFamilies: number;
  /** Corresponding NGSL band (New General Service List) */
  ngslBand: string;
  /** Minimum Zipf frequency value of test item stimulus/options (1=rare, 7=very common) */
  minZipfStimulus: number;
  /** Maximum word length (syllables) appropriate in options */
  maxOptionSyllables: number;
  /** Topic-specific vocabulary status */
  subjectSpecificVocab: "none" | "very_limited" | "limited" | "moderate" | "broad" | "extensive";
  /** Academic vocabulary status */
  academicVocab: "none" | "emerging" | "functional" | "strong" | "full";
  /** Idiomatic / phrasal verb status */
  idioms: "none" | "very_limited" | "common_only" | "moderate" | "extensive";
  wordExamples: string[];   // Sample vocabulary at this level
  avoidInItems: string[];   // Words too difficult for this level
}

export const VOCABULARY_BANDS: Record<CefrLevel, VocabularyBand> = {
  PRE_A1: {
    level: "PRE_A1",
    productiveWordFamilies: 0,
    receptiveWordFamilies: 200,
    ngslBand: "Top 200 high-frequency words only",
    minZipfStimulus: 6.0,
    maxOptionSyllables: 2,
    subjectSpecificVocab: "none",
    academicVocab: "none",
    idioms: "none",
    wordExamples: ["cat", "dog", "go", "come", "house", "eat", "big", "small", "yes", "no", "hello", "goodbye", "please", "thank you"],
    avoidInItems: ["investigate", "approximately", "nevertheless", "furthermore", "consequence", "demonstrate"],
  },
  A1: {
    level: "A1",
    productiveWordFamilies: 500,
    receptiveWordFamilies: 1000,
    ngslBand: "NGSL top 500 (high-frequency core)",
    minZipfStimulus: 5.5,
    maxOptionSyllables: 3,
    subjectSpecificVocab: "very_limited",
    academicVocab: "none",
    idioms: "none",
    wordExamples: ["school", "family", "work", "home", "food", "drink", "shop", "walk", "read", "write", "morning", "evening", "happy", "angry", "beautiful", "cheap", "expensive"],
    avoidInItems: ["accommodate", "investigate", "subsequently", "phenomenon", "contemporary", "perceive"],
  },
  A2: {
    level: "A2",
    productiveWordFamilies: 1000,
    receptiveWordFamilies: 2000,
    ngslBand: "NGSL top 1000 + Oxford 2000",
    minZipfStimulus: 5.0,
    maxOptionSyllables: 3,
    subjectSpecificVocab: "limited",
    academicVocab: "none",
    idioms: "very_limited",
    wordExamples: ["journey", "environment", "tradition", "compare", "similar", "difference", "result", "describe", "explain", "information", "important", "popular", "surprise", "remember", "decide"],
    avoidInItems: ["paradigm", "subsequent", "notwithstanding", "unprecedented", "conjecture", "discrepancy"],
  },
  B1: {
    level: "B1",
    productiveWordFamilies: 2000,
    receptiveWordFamilies: 3500,
    ngslBand: "NGSL top 2000 + Oxford 3000",
    minZipfStimulus: 4.5,
    maxOptionSyllables: 4,
    subjectSpecificVocab: "moderate",
    academicVocab: "emerging",
    idioms: "common_only",
    wordExamples: ["achieve", "affect", "benefit", "challenge", "consider", "develop", "establish", "involve", "provide", "require", "suggest", "research", "context", "impact", "solution", "approach", "support", "issue"],
    avoidInItems: ["esoteric", "penultimate", "disingenuousness", "epistemological", "synecdoche", "colloquialism"],
  },
  B2: {
    level: "B2",
    productiveWordFamilies: 4000,
    receptiveWordFamilies: 6000,
    ngslBand: "NGSL top 3000 + Academic Word List (AWL) Sublists 1-5",
    minZipfStimulus: 4.0,
    maxOptionSyllables: 5,
    subjectSpecificVocab: "broad",
    academicVocab: "functional",
    idioms: "moderate",
    wordExamples: ["analyse", "concept", "consequence", "contribute", "demonstrate", "evaluate", "furthermore", "hypothesis", "implement", "significant", "variable", "indicate", "assume", "principle", "strategy", "diverse", "constitute", "complex"],
    avoidInItems: ["solipsistic", "desiderata", "apophenia", "epistemics", "hermeneutic"],
  },
  C1: {
    level: "C1",
    productiveWordFamilies: 8000,
    receptiveWordFamilies: 12000,
    ngslBand: "NGSL + AWL full + Oxford 5000 + specialised sublists",
    minZipfStimulus: 3.5,
    maxOptionSyllables: 6,
    subjectSpecificVocab: "extensive",
    academicVocab: "strong",
    idioms: "extensive",
    wordExamples: ["albeit", "attribute", "caveat", "conjecture", "delineate", "elicit", "empirical", "engender", "exemplify", "inherent", "nuance", "paradigm", "proliferate", "rhetoric", "scrutinise", "substantiate", "tangential", "ubiquitous"],
    avoidInItems: ["highly domain-specific technical jargon outside candidate's field"],
  },
  C2: {
    level: "C2",
    productiveWordFamilies: 16000,
    receptiveWordFamilies: 20000,
    ngslBand: "Full vocabulary range including archaic, literary, and highly specialised registers",
    minZipfStimulus: 2.0,
    maxOptionSyllables: 7,
    subjectSpecificVocab: "extensive",
    academicVocab: "full",
    idioms: "extensive",
    wordExamples: ["tendentious", "inimical", "perspicacious", "syllogism", "periphrasis", "apotheosis", "prolix", "verisimilitude", "palimpsest", "recondite"],
    avoidInItems: [],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. TEXT COMPLEXITY PARAMETERS
//    Target readability metrics for reading passages / listening transcripts.
//    Based on Biber (1988), Cai & Leung (2016), and Cambridge corpus analysis.
// ─────────────────────────────────────────────────────────────────────────────

export interface TextComplexity {
  level: CefrLevel;
  /** Target average sentence length (words) */
  avgSentenceLength: { min: number; max: number };
  /** Max clauses per sentence */
  maxClausesPerSentence: number;
  /** Target type-token ratio (TTR): lexical diversity 0–1 */
  ttr: { min: number; max: number };
  /** Lexical density (content words / total words) */
  lexicalDensity: { min: number; max: number };
  /** Max proportion of low-frequency words (below NGSL band) in passage */
  maxLowFreqWordProportion: number;
  /** Passage length for reading items (words) */
  readingPassageLength: { min: number; max: number };
  /** Listening transcript length (words) */
  listeningTranscriptLength: { min: number; max: number };
  /** Recommended Flesch-Kincaid Grade Level range */
  fleschKincaidGrade: { min: number; max: number };
  /** Sentence type distribution: proportion of simple sentences */
  simpleSentenceProportion: { min: number; max: number };
  /** Key text features */
  textFeatures: string[];
}

export const TEXT_COMPLEXITY: Record<CefrLevel, TextComplexity> = {
  PRE_A1: {
    level: "PRE_A1",
    avgSentenceLength: { min: 3, max: 7 },
    maxClausesPerSentence: 1,
    ttr: { min: 0.40, max: 0.65 },
    lexicalDensity: { min: 0.35, max: 0.50 },
    maxLowFreqWordProportion: 0.02,
    readingPassageLength: { min: 10, max: 30 },
    listeningTranscriptLength: { min: 20, max: 50 },
    fleschKincaidGrade: { min: 1, max: 2 },
    simpleSentenceProportion: { min: 0.95, max: 1.0 },
    textFeatures: ["Single clause only", "Labelling / matching format", "Pictures with captions", "Formulaic phrases only"],
  },
  A1: {
    level: "A1",
    avgSentenceLength: { min: 5, max: 10 },
    maxClausesPerSentence: 2,
    ttr: { min: 0.50, max: 0.70 },
    lexicalDensity: { min: 0.40, max: 0.52 },
    maxLowFreqWordProportion: 0.05,
    readingPassageLength: { min: 30, max: 80 },
    listeningTranscriptLength: { min: 40, max: 100 },
    fleschKincaidGrade: { min: 2, max: 4 },
    simpleSentenceProportion: { min: 0.80, max: 1.0 },
    textFeatures: ["Short simple sentences", "High-frequency vocabulary only", "Coordinating conjunctions (and, but, because)", "Present tense dominant", "Concrete topics only", "Repetition acceptable"],
  },
  A2: {
    level: "A2",
    avgSentenceLength: { min: 8, max: 14 },
    maxClausesPerSentence: 3,
    ttr: { min: 0.55, max: 0.75 },
    lexicalDensity: { min: 0.42, max: 0.54 },
    maxLowFreqWordProportion: 0.08,
    readingPassageLength: { min: 60, max: 150 },
    listeningTranscriptLength: { min: 80, max: 160 },
    fleschKincaidGrade: { min: 4, max: 6 },
    simpleSentenceProportion: { min: 0.60, max: 0.85 },
    textFeatures: ["Mix of simple and compound sentences", "Basic subordination (because, when, if)", "Personal letters, short messages, signs, menus", "Dialogue with clear speaker identification", "Everyday concrete and semi-familiar topics"],
  },
  B1: {
    level: "B1",
    avgSentenceLength: { min: 12, max: 20 },
    maxClausesPerSentence: 4,
    ttr: { min: 0.58, max: 0.78 },
    lexicalDensity: { min: 0.44, max: 0.56 },
    maxLowFreqWordProportion: 0.12,
    readingPassageLength: { min: 150, max: 350 },
    listeningTranscriptLength: { min: 150, max: 300 },
    fleschKincaidGrade: { min: 6, max: 8 },
    simpleSentenceProportion: { min: 0.35, max: 0.60 },
    textFeatures: ["Complex sentences with multiple subordinate clauses", "Opinions and argument emerge", "Discourse markers: however, although, because of this", "Factual articles, narratives, instructions", "Some abstract concepts but grounded in examples", "British/American newspaper style appropriate"],
  },
  B2: {
    level: "B2",
    avgSentenceLength: { min: 16, max: 26 },
    maxClausesPerSentence: 5,
    ttr: { min: 0.62, max: 0.82 },
    lexicalDensity: { min: 0.46, max: 0.60 },
    maxLowFreqWordProportion: 0.18,
    readingPassageLength: { min: 300, max: 600 },
    listeningTranscriptLength: { min: 250, max: 450 },
    fleschKincaidGrade: { min: 8, max: 11 },
    simpleSentenceProportion: { min: 0.20, max: 0.45 },
    textFeatures: ["Complex argument with counter-argument", "Cohesion through pronoun reference and substitution", "Nominalisations emerging", "Literary prose and formal articles appropriate", "Some idiomatic language", "Passive voice in academic register", "Sub-clauses and embedded clauses frequent"],
  },
  C1: {
    level: "C1",
    avgSentenceLength: { min: 20, max: 35 },
    maxClausesPerSentence: 7,
    ttr: { min: 0.67, max: 0.88 },
    lexicalDensity: { min: 0.50, max: 0.65 },
    maxLowFreqWordProportion: 0.25,
    readingPassageLength: { min: 500, max: 900 },
    listeningTranscriptLength: { min: 350, max: 600 },
    fleschKincaidGrade: { min: 11, max: 14 },
    simpleSentenceProportion: { min: 0.10, max: 0.30 },
    textFeatures: ["Dense, highly cohesive prose", "Extensive use of nominalisations and abstract nouns", "Inversion for emphasis", "Sophisticated connectors (notwithstanding, inasmuch as)", "Academic and literary genres fully in scope", "Low-frequency lexical items", "Complex modality (epistemic hedging)", "Technical vocabulary in context"],
  },
  C2: {
    level: "C2",
    avgSentenceLength: { min: 22, max: 45 },
    maxClausesPerSentence: 9,
    ttr: { min: 0.72, max: 0.92 },
    lexicalDensity: { min: 0.55, max: 0.70 },
    maxLowFreqWordProportion: 0.35,
    readingPassageLength: { min: 700, max: 1200 },
    listeningTranscriptLength: { min: 400, max: 700 },
    fleschKincaidGrade: { min: 14, max: 18 },
    simpleSentenceProportion: { min: 0.05, max: 0.20 },
    textFeatures: ["Expert academic and literary prose", "Stylistic variation across the same text for rhetorical effect", "Archaic or poetic forms may appear", "Metalinguistic commentary", "Fine-grained distinction in semantics and pragmatics", "Full range of register from colloquial to formal within one text"],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. ERROR PROFILES PER LEVEL
//    Typical fossilised and developmental errors at each level.
//    Used by: distractor designers, auto-scoring rubrics, DIF analysis.
// ─────────────────────────────────────────────────────────────────────────────

export interface ErrorProfile {
  level: CefrLevel;
  grammarErrors: ErrorType[];
  vocabularyErrors: ErrorType[];
  discoursePragmaticErrors: ErrorType[];
}

export interface ErrorType {
  error: string;
  example: string;
  targetForm: string;
  frequency: "very_common" | "common" | "occasional";
}

export const ERROR_PROFILES: Record<CefrLevel, ErrorProfile> = {
  PRE_A1: {
    level: "PRE_A1",
    grammarErrors: [
      { error: "Missing copula", example: "She teacher.", targetForm: "She is a teacher.", frequency: "very_common" },
      { error: "L1 word order transfer", example: "I have hungry.", targetForm: "I am hungry.", frequency: "very_common" },
      { error: "Omission of article", example: "He is student.", targetForm: "He is a student.", frequency: "very_common" },
    ],
    vocabularyErrors: [
      { error: "L1 word used", example: "[L1 word]", targetForm: "Target English word", frequency: "very_common" },
    ],
    discoursePragmaticErrors: [
      { error: "No discourse connectors", example: "I go. I eat. I sleep.", targetForm: "I go, eat, and sleep.", frequency: "very_common" },
    ],
  },
  A1: {
    level: "A1",
    grammarErrors: [
      { error: "3rd person -s omission", example: "She go to school.", targetForm: "She goes to school.", frequency: "very_common" },
      { error: "Auxiliary do/does in questions omitted", example: "Where you live?", targetForm: "Where do you live?", frequency: "very_common" },
      { error: "Double negative", example: "I don't have no money.", targetForm: "I don't have any money.", frequency: "common" },
      { error: "Pronoun subject–object confusion", example: "Me and him went.", targetForm: "He and I went.", frequency: "common" },
      { error: "Irregular past form regularised", example: "I goed / I catched", targetForm: "I went / I caught", frequency: "very_common" },
      { error: "Present continuous for habitual action", example: "I am going to school every day.", targetForm: "I go to school every day.", frequency: "common" },
    ],
    vocabularyErrors: [
      { error: "False cognate", example: "I am very sensible. (= sensitive)", targetForm: "I am very sensitive.", frequency: "common" },
      { error: "Overextension of high-frequency word", example: "She made a good party.", targetForm: "She threw/had a good party.", frequency: "common" },
    ],
    discoursePragmaticErrors: [
      { error: "Overuse of 'and' as only connector", example: "I went to the shop and I bought milk and I came home and…", targetForm: "Use: after that, then, also", frequency: "very_common" },
    ],
  },
  A2: {
    level: "A2",
    grammarErrors: [
      { error: "Present perfect vs. past simple confusion", example: "Did you ever see that film?", targetForm: "Have you ever seen that film?", frequency: "very_common" },
      { error: "Will vs. going to confusion", example: "I will go to London next month (with plan = going to)", targetForm: "I'm going to go to London.", frequency: "common" },
      { error: "Comparative double marking", example: "She is more taller.", targetForm: "She is taller.", frequency: "very_common" },
      { error: "Countable/uncountable confusion", example: "many informations, few furnitures", targetForm: "much information, little furniture", frequency: "very_common" },
      { error: "Article omission with singular countable", example: "She is doctor.", targetForm: "She is a doctor.", frequency: "common" },
      { error: "Modal + infinitive vs. Modal + base form", example: "She can to speak French.", targetForm: "She can speak French.", frequency: "very_common" },
      { error: "Relative clause pronoun choice", example: "The man which I met", targetForm: "The man who/whom I met", frequency: "common" },
    ],
    vocabularyErrors: [
      { error: "Phrasal verb avoidance (replaced by formal lexis)", example: "I found out → I discovered (over-formal)", targetForm: "Accept both; score lower if only formal available at this level", frequency: "occasional" },
      { error: "Collocational error (make/do confusion)", example: "do a decision, make homework", targetForm: "make a decision, do homework", frequency: "very_common" },
    ],
    discoursePragmaticErrors: [
      { error: "No paragraph structure", example: "Continuous text with no discourse signals", targetForm: "First…then…finally…", frequency: "common" },
    ],
  },
  B1: {
    level: "B1",
    grammarErrors: [
      { error: "Reported speech backshift omission", example: "She said she is tired.", targetForm: "She said she was tired.", frequency: "very_common" },
      { error: "Passive voice agent preposition", example: "It was made from scientists.", targetForm: "It was made by scientists.", frequency: "common" },
      { error: "Gerund vs. infinitive after certain verbs", example: "She stopped to smoke (meaning she paused to light a cigarette)", targetForm: "She stopped smoking (quit); He stopped to buy coffee (paused)", frequency: "common" },
      { error: "Wish + present tense", example: "I wish I have more time.", targetForm: "I wish I had more time.", frequency: "very_common" },
      { error: "Third conditional formation", example: "If I would have known, I wouldn't go.", targetForm: "If I had known, I wouldn't have gone.", frequency: "common" },
    ],
    vocabularyErrors: [
      { error: "Register mismatch (too informal in formal context)", example: "The government is gonna fix it. (formal essay)", targetForm: "The government is going to address it.", frequency: "common" },
      { error: "Word form error", example: "He is very success. / She works hardly.", targetForm: "He is very successful. / She works hard.", frequency: "common" },
    ],
    discoursePragmaticErrors: [
      { error: "Overuse of basic connectors", example: "but, so, because dominate — no 'however', 'as a result'", targetForm: "however, therefore, as a result, on the other hand", frequency: "common" },
      { error: "Lack of hedging in opinion", example: "Climate change is definitely caused by humans.", targetForm: "Climate change is widely believed to be caused by humans.", frequency: "common" },
    ],
  },
  B2: {
    level: "B2",
    grammarErrors: [
      { error: "Mixed conditional construction errors", example: "If I was taller, I would have played basketball professionally.", targetForm: "If I were taller (2nd) OR If I had been taller, I would have played… (3rd)", frequency: "common" },
      { error: "Subjunctive after formal verbs", example: "I suggest that he goes.", targetForm: "I suggest (that) he go.", frequency: "common" },
      { error: "Inversion after negative adverb", example: "Rarely I have seen such talent.", targetForm: "Rarely have I seen such talent.", frequency: "common" },
      { error: "Nominalisation overuse causing awkward register", example: "The realisation of the project by the team had a success.", targetForm: "The team successfully completed the project.", frequency: "occasional" },
    ],
    vocabularyErrors: [
      { error: "Collocation with academic verbs", example: "do/perform/make research (do is acceptable; conduct is more precise)", targetForm: "conduct research, carry out a study", frequency: "common" },
      { error: "Idiomatic overreach (using idioms incorrectly)", example: "The issue is a hot button topic that hits two birds.", targetForm: "The issue is a hotly debated topic that addresses two challenges at once.", frequency: "occasional" },
    ],
    discoursePragmaticErrors: [
      { error: "Reference tracking failure in long texts", example: "unclear 'it', 'they', 'this' reference", targetForm: "Clear antecedent establishment before pronoun use", frequency: "common" },
      { error: "Paragraph coherence: topic sentence absent", example: "Paragraph begins with supporting detail, no topic sentence", targetForm: "Topic sentence → development → concluding sentence", frequency: "common" },
    ],
  },
  C1: {
    level: "C1",
    grammarErrors: [
      { error: "Overuse of passivisation for formality", example: "Every action is being taken by the committee to address the matter being raised by all parties.", targetForm: "Judicious passive where focus shift is needed; active elsewhere", frequency: "occasional" },
      { error: "Participle clause subject mismatch", example: "Walking down the street, the shop was noticed.", targetForm: "Walking down the street, she noticed the shop.", frequency: "common" },
    ],
    vocabularyErrors: [
      { error: "Near-synonym confusion at high level", example: "The report elucidated / illuminated / elicited the findings. (wrong choice)", targetForm: "Elucidated = clarified; Elicited = drew out; Illuminated = shed light on", frequency: "common" },
      { error: "Stylistic register clash in academic writing", example: "The data clearly shows that this stuff is super important.", targetForm: "The data clearly demonstrates that this factor is of considerable significance.", frequency: "common" },
    ],
    discoursePragmaticErrors: [
      { error: "Insufficient hedging in academic writing", example: "This proves that the hypothesis is correct.", targetForm: "This suggests/indicates that the hypothesis may be valid.", frequency: "common" },
      { error: "Coherence failure at macro-level", example: "Each sentence is correct but paragraphs do not build an argument", targetForm: "Logical progression: claim → evidence → analysis → link to thesis", frequency: "occasional" },
    ],
  },
  C2: {
    level: "C2",
    grammarErrors: [
      { error: "Stylistic over-complexity (garden path sentences)", example: "The horse raced past the barn fell. (syntactic ambiguity)", targetForm: "Conscious resolution of syntactic ambiguity", frequency: "occasional" },
    ],
    vocabularyErrors: [
      { error: "Misused technical term outside field expertise", example: "Using 'epistemology' loosely where 'perspective' would be accurate", targetForm: "Precise technical application only when semantics are fully controlled", frequency: "occasional" },
    ],
    discoursePragmaticErrors: [
      { error: "Register inconsistency across long text", example: "Formal analysis paragraph followed by casual aside without signal", targetForm: "Explicit or stylistic signalling of register shift", frequency: "occasional" },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. EXTENDED CAN-DO DESCRIPTORS (2018 CEFR COMPANION VOLUME)
//    Includes: Interaction, Mediation, Online/Digital interaction.
//    More granular than the original 2001 CEFR descriptors.
// ─────────────────────────────────────────────────────────────────────────────

export type ExtendedDomain =
  | "reading" | "listening" | "writing" | "speaking"
  | "interaction_spoken" | "interaction_written"
  | "mediation" | "online_digital" | "plurilingual";

export interface ExtendedCanDo {
  level: CefrLevel;
  domain: ExtendedDomain;
  category: string;
  descriptors: string[];
}

export const EXTENDED_CAN_DO: ExtendedCanDo[] = [
  // ── PRE_A1 ──────────────────────────────────────────────────────────────────
  { level: "PRE_A1", domain: "reading", category: "Basic recognition",
    descriptors: ["Can match objects to words in a labelled picture.", "Can recognise own name in writing.", "Can identify numbers and prices on signs."] },
  { level: "PRE_A1", domain: "listening", category: "Basic recognition",
    descriptors: ["Can understand own name and greetings.", "Can follow very short simple instructions.", "Can recognise key words in very slow, clearly articulated speech."] },
  { level: "PRE_A1", domain: "writing", category: "Basic production",
    descriptors: ["Can copy words and short phrases.", "Can write own name and address."] },
  { level: "PRE_A1", domain: "speaking", category: "Basic oral production",
    descriptors: ["Can produce isolated words and phrases.", "Can give own name and personal details using a few words."] },

  // ── A1 ──────────────────────────────────────────────────────────────────────
  { level: "A1", domain: "reading", category: "Reading for orientation",
    descriptors: [
      "Can understand familiar names, words and short simple sentences (notices, posters, catalogues).",
      "Can understand short, simple messages, such as a text message from a friend.",
      "Can recognise numbers, prices and times on tickets and menus.",
      "Can follow short, simple written directions (e.g. Go straight on. Turn left.).",
    ]
  },
  { level: "A1", domain: "listening", category: "Listening to interactions",
    descriptors: [
      "Can understand simple questions and instructions if they are clearly articulated and spoken slowly.",
      "Can catch the main point in short, clear, simple messages and announcements.",
      "Can understand the key words in conversations about familiar topics: shopping, family, weather.",
    ]
  },
  { level: "A1", domain: "writing", category: "Creative writing",
    descriptors: [
      "Can write a short, simple postcard.",
      "Can fill in forms with personal details (name, nationality, address).",
      "Can write very simple sentences about themselves using a model.",
    ]
  },
  { level: "A1", domain: "speaking", category: "Oral production",
    descriptors: [
      "Can produce simple mainly isolated phrases about people and places.",
      "Can ask and answer simple questions in areas of immediate need or very familiar topics.",
      "Can describe where they live and people they know using simple words.",
    ]
  },
  { level: "A1", domain: "interaction_spoken", category: "Simple spoken interaction",
    descriptors: [
      "Can interact in a simple way if the other person is prepared to repeat slowly and help.",
      "Can ask and answer questions about personal details.",
      "Can understand everyday expressions for transactions such as buying something in a shop.",
    ]
  },
  { level: "A1", domain: "online_digital", category: "Basic digital literacy",
    descriptors: [
      "Can understand very simple online messages.",
      "Can fill in an online form with personal information.",
    ]
  },

  // ── A2 ──────────────────────────────────────────────────────────────────────
  { level: "A2", domain: "reading", category: "Reading for information and argument",
    descriptors: [
      "Can identify specific information in simple texts (adverts, menus, timetables).",
      "Can understand personal letters describing events, feelings and wishes.",
      "Can understand short simple texts on familiar matters of a concrete type.",
      "Can find specific predictable information in simple everyday materials such as advertisements, prospectuses and menus.",
      "Can understand short simple personal letters.",
    ]
  },
  { level: "A2", domain: "listening", category: "Listening as a member of a live audience",
    descriptors: [
      "Can understand the main points in short, clear messages and announcements.",
      "Can understand simple technical information such as operating instructions for familiar equipment.",
      "Can catch the main point of short, clear talks on familiar topics.",
      "Can understand simple conversations about everyday topics (shopping, transport, directions).",
    ]
  },
  { level: "A2", domain: "writing", category: "Writing",
    descriptors: [
      "Can write a series of simple phrases and sentences connected with and, but, because.",
      "Can write short, simple notes and messages.",
      "Can write a very simple personal letter, for example thanking someone.",
      "Can describe in short sentences simple aspects of everyday life.",
    ]
  },
  { level: "A2", domain: "speaking", category: "Describing experience",
    descriptors: [
      "Can use simple, everyday polite forms of greeting.",
      "Can describe family, living conditions, education and present or recent job.",
      "Can give reasons and explanations for opinions, plans and actions using basic connectors.",
      "Can narrate a story or relate the plot of a film using simple language.",
    ]
  },
  { level: "A2", domain: "interaction_spoken", category: "Transactional exchanges",
    descriptors: [
      "Can get simple information about travel, use public transport, order food, shop.",
      "Can make and respond to invitations, suggestions and apologies.",
      "Can discuss what to do, where to go.",
    ]
  },
  { level: "A2", domain: "interaction_written", category: "Written interaction",
    descriptors: [
      "Can write short, simple notes and messages.",
      "Can handle very short social correspondence.",
    ]
  },
  { level: "A2", domain: "mediation", category: "Basic mediation",
    descriptors: [
      "Can convey basic information from a short text to another person using simple language.",
    ]
  },

  // ── B1 ──────────────────────────────────────────────────────────────────────
  { level: "B1", domain: "reading", category: "Reading for information",
    descriptors: [
      "Can scan through straightforward factual texts in newspapers or online to understand general meaning.",
      "Can understand texts that consist mainly of high-frequency everyday language.",
      "Can understand the description of events, feelings and wishes in personal letters well enough to correspond regularly with a pen friend.",
      "Can identify the main conclusions in clearly signposted argumentative texts.",
      "Can understand routine letters from hotels, authorities, schools.",
      "Can recognise significant points in straightforward newspaper articles.",
    ]
  },
  { level: "B1", domain: "listening", category: "Listening to media",
    descriptors: [
      "Can follow a lecture or talk within own field if the topic is familiar and the delivery is clear.",
      "Can understand the main points of radio news on familiar topics.",
      "Can catch the main point in short presentations on familiar topics.",
      "Can understand simple technical discussions in own field.",
      "Can follow a documentary or feature film that deals with topics within personal experience.",
    ]
  },
  { level: "B1", domain: "writing", category: "Writing",
    descriptors: [
      "Can write straightforward connected text on familiar topics.",
      "Can write personal letters describing experiences and impressions in some detail.",
      "Can write formal letters requesting information or explaining a problem.",
      "Can write descriptions of events, trips and personal experiences.",
      "Can write a short report providing information about familiar topics.",
    ]
  },
  { level: "B1", domain: "speaking", category: "Sustained monologue",
    descriptors: [
      "Can give a straightforward description or narration of a familiar topic.",
      "Can keep going comprehensibly, even though pausing for planning is noticeable.",
      "Can express the main point clearly with reasonable precision.",
      "Can narrate a story or relate the plot of a book or film.",
      "Can briefly give reasons and explanations for opinions and plans.",
    ]
  },
  { level: "B1", domain: "interaction_spoken", category: "Goal-oriented cooperation",
    descriptors: [
      "Can explore and maintain positions in discussion.",
      "Can invite others into discussion.",
      "Can deal with most situations likely to arise when travelling.",
      "Can enter unprepared into conversations on familiar topics.",
    ]
  },
  { level: "B1", domain: "interaction_written", category: "Written correspondence",
    descriptors: [
      "Can convey information and ideas on abstract and concrete topics, check information and ask about or explain problems.",
      "Can write letters conveying degrees of emotion and highlighting personal significance of events.",
    ]
  },
  { level: "B1", domain: "mediation", category: "Facilitating communication",
    descriptors: [
      "Can summarise the main points of a short text in simple language.",
      "Can explain the gist of a text to another person.",
    ]
  },
  { level: "B1", domain: "online_digital", category: "Digital production",
    descriptors: [
      "Can write posts and messages about familiar topics in online forums.",
      "Can update a basic profile page.",
      "Can follow clearly expressed reasoning in an online discussion.",
    ]
  },

  // ── B2 ──────────────────────────────────────────────────────────────────────
  { level: "B2", domain: "reading", category: "Critical reading",
    descriptors: [
      "Can read articles and reports concerned with contemporary problems with a high degree of independence.",
      "Can understand contemporary literary prose.",
      "Can understand a wide range of long and complex factual and literary texts.",
      "Can recognise a writer's point of view and detect implicit attitudes.",
      "Can follow the essential points of a debate that is conducted in clear, standard language.",
      "Can identify the underlying themes of a complex argument.",
      "Can understand specialised texts and instructions of a technical nature as long as they are in own field.",
    ]
  },
  { level: "B2", domain: "listening", category: "Understanding complex interaction",
    descriptors: [
      "Can understand extended speech and lectures and follow complex lines of argument.",
      "Can understand most TV news and current affairs programmes.",
      "Can understand recorded material in standard dialect at normal speed.",
      "Can understand the main ideas of complex speech on both concrete and abstract topics.",
      "Can follow a documentary and understand the stance of the speaker.",
    ]
  },
  { level: "B2", domain: "writing", category: "Argumentative writing",
    descriptors: [
      "Can write clear, detailed text on a wide range of subjects related to interests.",
      "Can write an essay or report passing on information or giving reasons for or against a viewpoint.",
      "Can write letters highlighting the personal significance of events and experiences.",
      "Can write a detailed description of experiences, feelings and events.",
      "Can synthesise information and arguments from several sources.",
    ]
  },
  { level: "B2", domain: "speaking", category: "Formal speaking",
    descriptors: [
      "Can give clear, detailed descriptions and presentations on complex subjects.",
      "Can develop an argument systematically with appropriate highlighting of significant points and conclusion.",
      "Can construct a chain of reasoned argument.",
      "Can speculate about causes, consequences and hypothetical situations.",
    ]
  },
  { level: "B2", domain: "interaction_spoken", category: "Discussion and debate",
    descriptors: [
      "Can sustain a conversation on a wide range of subjects with a high degree of fluency and spontaneity.",
      "Can interact spontaneously, often with native speakers without imposing strain.",
      "Can account for and sustain positions, evaluate alternative proposals.",
      "Can politely indicate disagreement and challenge inferences.",
    ]
  },
  { level: "B2", domain: "mediation", category: "Mediating a text",
    descriptors: [
      "Can synthesise information from different sources and present it coherently.",
      "Can relay specific information required by a third party.",
      "Can paraphrase texts accurately and fluently.",
    ]
  },
  { level: "B2", domain: "online_digital", category: "Online interaction",
    descriptors: [
      "Can interact online to discuss complex issues.",
      "Can follow and participate in animated online discussions on familiar topics.",
      "Can write posts and messages conveying nuanced opinions.",
    ]
  },

  // ── C1 ──────────────────────────────────────────────────────────────────────
  { level: "C1", domain: "reading", category: "Reading for mastery",
    descriptors: [
      "Can understand long, complex factual and literary texts, appreciating distinctions of style.",
      "Can understand specialised articles and longer technical instructions outside own field.",
      "Can read modern literary texts with a high degree of independence.",
      "Can appreciate and use implicit meaning, irony and cultural allusion.",
      "Can follow the development of complex arguments in academic and professional texts.",
    ]
  },
  { level: "C1", domain: "listening", category: "Listening with ease",
    descriptors: [
      "Can understand extended speech even when it is not clearly structured.",
      "Can understand TV programmes and films without effort.",
      "Can understand complex academic lectures on unfamiliar topics.",
      "Can follow heated, idiomatic exchanges between native speakers.",
      "Can detect speaker bias, stance and implicature in public discourse.",
    ]
  },
  { level: "C1", domain: "writing", category: "Academic and professional writing",
    descriptors: [
      "Can express ideas fluently and spontaneously without much obvious searching for expressions.",
      "Can use language flexibly and effectively for social, academic and professional purposes.",
      "Can produce clear, well-structured, detailed text on complex subjects.",
      "Can write well-structured and appropriately cohesive complex letters and reports.",
    ]
  },
  { level: "C1", domain: "speaking", category: "Sophisticated oral production",
    descriptors: [
      "Can describe or narrate, integrating sub-themes and developing particular points.",
      "Can handle abstract and linguistically demanding subjects with sophistication.",
      "Can give clear, well-structured presentations, departing spontaneously from a prepared text.",
      "Can use language flexibly and effectively with precise meaning.",
    ]
  },
  { level: "C1", domain: "interaction_spoken", category: "Effortless interaction",
    descriptors: [
      "Can express ideas fluently and spontaneously in discussion.",
      "Can select an appropriate phrase from a readily available range to preface remarks.",
      "Can backtrack and restructure around a difficulty smoothly.",
      "Can distinguish finer shades of meaning in complex situations.",
    ]
  },
  { level: "C1", domain: "mediation", category: "Expert mediation",
    descriptors: [
      "Can summarise long, demanding texts accurately.",
      "Can develop and present an argument from source material.",
      "Can expand on and defend points of view at some length.",
    ]
  },
  { level: "C1", domain: "plurilingual", category: "Plurilingual repertoire",
    descriptors: [
      "Can discuss cross-linguistic comparisons with precision.",
      "Can use L1 strategic competence explicitly for L2 problem-solving.",
    ]
  },

  // ── C2 ──────────────────────────────────────────────────────────────────────
  { level: "C2", domain: "reading", category: "Mastery",
    descriptors: [
      "Can understand virtually every form of written language including abstract, structurally complex or colloquial literary and non-literary writing.",
      "Can understand the full range of stylistic and genre conventions of written texts.",
    ]
  },
  { level: "C2", domain: "listening", category: "Mastery",
    descriptors: [
      "Can understand any native speaker, accounting for regional accents.",
      "Can follow complex speeches, arguments and academic lectures without effort.",
      "Can detect connotation, irony, sub-text and implicature effortlessly.",
    ]
  },
  { level: "C2", domain: "writing", category: "Mastery",
    descriptors: [
      "Can write clear, smoothly flowing, complex letters, reports or articles with an appropriate and effective logical structure.",
      "Can write complex reports, articles or essays that present a case with an effective logical structure.",
      "Can produce creative, imaginative or humorous writing in a convincing personal style.",
    ]
  },
  { level: "C2", domain: "speaking", category: "Mastery",
    descriptors: [
      "Can convey finer shades of meaning precisely by using, with reasonable accuracy, a wide range of modification devices.",
      "Can reformulate ideas in differing linguistic forms to give emphasis, differentiate and eliminate ambiguity.",
    ]
  },
  { level: "C2", domain: "mediation", category: "Expert mediation",
    descriptors: [
      "Can mediate between speakers of different languages using appropriate technical vocabulary and cultural sensitivity.",
      "Can produce precise, fluent, well-structured text, critically evaluating competing information.",
    ]
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 6. DISCOURSE & PRAGMATIC COMPETENCE MARKERS PER LEVEL
// ─────────────────────────────────────────────────────────────────────────────

export interface DiscourseProfile {
  level: CefrLevel;
  /** Discourse markers expected in production at this level */
  productiveMarkers: string[];
  /** Cohesion devices produced at this level */
  cohesionDevices: string[];
  /** Pragmatic functions controlled */
  pragmaticFunctions: string[];
  /** Hedging language available */
  hedges: string[];
  /** Stance markers used */
  stanceMarkers: string[];
  /** Turn-taking and interaction strategies */
  interactionStrategies: string[];
}

export const DISCOURSE_PROFILES: Record<CefrLevel, DiscourseProfile> = {
  PRE_A1: {
    level: "PRE_A1",
    productiveMarkers: ["and"],
    cohesionDevices: ["Repetition of key nouns"],
    pragmaticFunctions: ["Greeting", "Naming objects"],
    hedges: [],
    stanceMarkers: [],
    interactionStrategies: ["Non-verbal", "L1 transfer"],
  },
  A1: {
    level: "A1",
    productiveMarkers: ["and", "but", "because", "then", "so"],
    cohesionDevices: ["Pronoun reference (it, he, she, they)", "Repetition", "Enumeration"],
    pragmaticFunctions: ["Greeting/farewell", "Requesting information", "Expressing likes/dislikes", "Simple agreement/disagreement"],
    hedges: ["I think", "maybe"],
    stanceMarkers: ["I like", "I don't like"],
    interactionStrategies: ["Asking for repetition (Sorry? / Can you say again?)", "Checking comprehension (OK?)"],
  },
  A2: {
    level: "A2",
    productiveMarkers: ["but", "because", "so", "also", "first", "then", "after that", "finally", "although", "when"],
    cohesionDevices: ["Pronoun substitution", "Demonstrative reference (this, that)", "Ellipsis in simple contexts", "Lexical repetition and synonymy"],
    pragmaticFunctions: ["Making suggestions", "Accepting / declining invitations", "Expressing surprise", "Giving advice (You should…)", "Apologising", "Thanking"],
    hedges: ["I think", "maybe", "perhaps", "I'm not sure but"],
    stanceMarkers: ["In my opinion", "I believe", "I prefer"],
    interactionStrategies: ["Signalling non-understanding (I don't understand)", "Asking for help with vocabulary (What does ___ mean?)", "Checking understanding (Do you mean…?)"],
  },
  B1: {
    level: "B1",
    productiveMarkers: ["however", "on the other hand", "as a result", "therefore", "for example", "such as", "in addition", "furthermore", "nevertheless", "despite this", "whereas"],
    cohesionDevices: ["Pronoun chains", "Demonstrative reference", "Substitution (do so, one)", "Lexical chains", "Discourse structure signals (Firstly…, To begin with…, In conclusion)"],
    pragmaticFunctions: ["Expressing opinion with justification", "Presenting arguments and counter-arguments (basic)", "Making indirect requests", "Expressing (dis)agreement with nuance", "Hypothesising"],
    hedges: ["I think…because", "It seems to me", "In my opinion", "It's possible that", "It might be the case that"],
    stanceMarkers: ["Personally, I believe", "From my perspective", "As far as I know"],
    interactionStrategies: ["Clarifying own position", "Reformulating (What I mean is…)", "Checking comprehension actively (Am I right in saying…?)"],
  },
  B2: {
    level: "B2",
    productiveMarkers: ["furthermore", "nonetheless", "in contrast", "consequently", "accordingly", "by contrast", "in other words", "to summarise", "provided that", "given that", "unless"],
    cohesionDevices: ["Complex reference chains", "Ellipsis across clause boundaries", "Parallel structure for cohesion", "Thematic progression (theme-rheme)"],
    pragmaticFunctions: ["Developing complex arguments", "Challenging a position diplomatically", "Expressing certainty/uncertainty on a scale", "Implying without stating", "Performing abstract speech acts (irony, understatement)"],
    hedges: ["It could be argued that", "There is some evidence to suggest", "One might say", "It remains to be seen whether"],
    stanceMarkers: ["Research suggests", "It is widely held that", "Critics argue", "I would contend"],
    interactionStrategies: ["Floor-taking (If I could just add…)", "Introducing counter-argument (Having said that…)", "Conceding before countering (While that may be true, …)"],
  },
  C1: {
    level: "C1",
    productiveMarkers: ["notwithstanding", "inasmuch as", "by the same token", "to that end", "insofar as", "in so far as", "with that in mind", "all things considered", "by extension"],
    cohesionDevices: ["Cross-sentence reference", "Lexical substitution with near-synonyms", "Ellipsis of full clauses", "Summative 'this' (This view…)", "Nominalisation for cross-reference"],
    pragmaticFunctions: ["Nuanced hedging in academic writing", "Signalling irony and understatement", "Developing position with qualification and concession", "Formulating hypotheses and evaluating evidence"],
    hedges: ["It is arguably the case that", "There is a body of evidence suggesting", "One cannot dismiss the possibility", "It would be premature to conclude"],
    stanceMarkers: ["The evidence points to", "A persuasive case can be made for", "Proponents of this view argue", "Counterintuitively,"],
    interactionStrategies: ["Implicit turn management", "Reformulation of complex ideas in real time", "Strategic digression and return"],
  },
  C2: {
    level: "C2",
    productiveMarkers: ["All C1 markers plus archaic/literary connectors: 'yet', 'albeit', 'therein', 'hitherto', 'whereupon'"],
    cohesionDevices: ["All cohesion devices with stylistic choice", "Anaphora and cataphora for rhetorical effect"],
    pragmaticFunctions: ["Full pragmatic range including irony, sarcasm, understatement, hyperbole, metalinguistic commentary"],
    hedges: ["Full epistemic hedging range with stylistic precision"],
    stanceMarkers: ["Full stance repertoire including irony, detachment, commitment"],
    interactionStrategies: ["Native-equivalent turn management", "Strategic ambiguity and resolution", "Metalinguistic commentary in real time"],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. TOPIC / STIMULUS SUITABILITY PER LEVEL + AGE GROUP
// ─────────────────────────────────────────────────────────────────────────────

export interface TopicProfile {
  level: CefrLevel;
  /** Safe, highly appropriate topics for all ages */
  coreTopics: string[];
  /** Topics appropriate for adults (18+) */
  adultTopics: string[];
  /** Topics appropriate for 11-14 (Junior Suite) */
  juniorTopics: string[];
  /** Topics appropriate for 7-10 (Primary) */
  primaryTopics: string[];
  /** Topics to avoid at this level (too abstract / culturally loaded / vocabulary too high) */
  avoidTopics: string[];
}

export const TOPIC_PROFILES: Record<CefrLevel, TopicProfile> = {
  PRE_A1: {
    level: "PRE_A1",
    coreTopics: ["Family members", "Colours", "Numbers 1-20", "Animals", "Food and drink", "Body parts", "Classroom objects", "Greetings"],
    adultTopics: [],
    juniorTopics: ["Toys", "Pets", "School items"],
    primaryTopics: ["Toys", "Pets", "School items", "My room"],
    avoidTopics: ["Any abstract concept", "News / current affairs", "Technology", "Any topic requiring more than 200 vocabulary items"],
  },
  A1: {
    level: "A1",
    coreTopics: ["Daily routines", "Family and friends", "Home and neighbourhood", "Food and shopping", "Free time / hobbies", "Transport", "Weather", "Physical appearance"],
    adultTopics: ["Simple work contexts (job title, workplace)"],
    juniorTopics: ["School day", "Sport", "Weekend activities", "Friends"],
    primaryTopics: ["My family", "My pets", "My school", "My favourite food", "Birthday parties", "Simple stories with animals"],
    avoidTopics: ["Politics", "Religion", "Historical analysis", "Economics", "Philosophical concepts", "Science beyond everyday objects"],
  },
  A2: {
    level: "A2",
    coreTopics: ["Travel and holidays", "Health and the body", "Shopping and money", "Entertainment (TV, music, films)", "Past experiences", "Future plans", "Likes and dislikes", "Simple descriptions of places"],
    adultTopics: ["Work and jobs (simple descriptions)", "Renting / accommodation"],
    juniorTopics: ["School projects", "Sports teams", "Social media (simple)", "Careers (aspirational)", "Pop culture"],
    primaryTopics: ["A favourite day out", "Animals in the wild", "Simple biographies of children", "Traditional stories retold simply"],
    avoidTopics: ["Ethical dilemmas", "Complex medical issues", "Legal/financial texts", "Philosophical debate", "Texts with heavy cultural loading"],
  },
  B1: {
    level: "B1",
    coreTopics: ["Education and learning", "Media and technology", "The environment", "Cultural differences", "Relationships", "Health and lifestyle", "Youth and society", "Sport at national level"],
    adultTopics: ["Work experience", "Simple news stories", "Community issues"],
    juniorTopics: ["STEM topics at introductory level", "Social issues (bullying, peer pressure)", "Global issues at accessible level"],
    primaryTopics: ["Nature and ecosystems (simple)", "Famous people (accessible biographies)", "Local community"],
    avoidTopics: ["Complex economic policy", "Advanced political analysis", "Philosophical abstraction", "Technically specialised texts"],
  },
  B2: {
    level: "B2",
    coreTopics: ["Global issues (environment, poverty, migration)", "Technology and society", "Science and discovery", "Business and economy (introductory)", "Art, literature and culture", "Ethics and values", "Health and medicine"],
    adultTopics: ["Workplace dynamics", "Legal and financial concepts at general level", "Public affairs and governance"],
    juniorTopics: ["STEM competitions", "Global citizenship", "Intercultural communication"],
    primaryTopics: [],
    avoidTopics: ["Highly specialised academic subfields without context", "Traumatic or graphic content"],
  },
  C1: {
    level: "C1",
    coreTopics: ["Philosophy and ideas", "Academic research and methodology", "Advanced science and technology", "International relations", "Economics and development", "Literary analysis", "History and historiography", "Ethics in professional contexts"],
    adultTopics: ["Legal discourse", "Medical ethics", "Political theory", "Psycholinguistics"],
    juniorTopics: [],
    primaryTopics: [],
    avoidTopics: ["Gratuitous or graphic content"],
  },
  C2: {
    level: "C2",
    coreTopics: ["Any academic, professional or literary topic", "Specialised discourse in any domain", "Metalinguistic analysis", "Critical theory", "Comparative cultural analysis"],
    adultTopics: ["All adult topics appropriate"],
    juniorTopics: [],
    primaryTopics: [],
    avoidTopics: ["Gratuitous or graphic content"],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. AI PROMPT BUILDER — FULL CEFR KNOWLEDGE INJECTION
//    Used by ai-item-generator.ts and scoring-orchestrator.ts to inject
//    detailed CEFR knowledge into generation and scoring prompts.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a comprehensive CEFR knowledge block for the AI to use as context.
 * This is injected into item generation and scoring prompts.
 */
export function buildCefrKnowledgeBlock(
  level: CefrLevel,
  options: {
    includeGrammar?: boolean;
    includeVocabulary?: boolean;
    includeTextComplexity?: boolean;
    includeErrorProfile?: boolean;
    includeDiscourse?: boolean;
    includeCanDo?: boolean;
    skill?: "reading" | "listening" | "writing" | "speaking" | "grammar" | "vocabulary";
    ageGroup?: "primary" | "junior" | "adult";
  } = {}
): string {
  const {
    includeGrammar = true,
    includeVocabulary = true,
    includeTextComplexity = true,
    includeErrorProfile = true,
    includeDiscourse = false,
    includeCanDo = true,
    skill,
    ageGroup = "adult",
  } = options;

  const lines: string[] = [
    `╔══════════════════════════════════════════════════════════════╗`,
    `  CEFR EXPERT KNOWLEDGE BLOCK — Level: ${level}`,
    `╚══════════════════════════════════════════════════════════════╝`,
    ``,
  ];

  // ── Can-Do Descriptors ──────────────────────────────────────────────────────
  if (includeCanDo) {
    const skillMap: Record<string, ExtendedDomain[]> = {
      reading: ["reading"],
      listening: ["listening"],
      writing: ["writing"],
      speaking: ["speaking"],
      grammar: ["reading", "writing"],
      vocabulary: ["reading", "listening"],
    };
    const domains = skill ? (skillMap[skill] ?? []) : ["reading", "listening", "writing", "speaking"];
    const relevantCanDo = EXTENDED_CAN_DO.filter(
      (d) => d.level === level && domains.includes(d.domain)
    );
    if (relevantCanDo.length > 0) {
      lines.push(`── CAN-DO STATEMENTS (${level}) ──`);
      for (const cd of relevantCanDo) {
        lines.push(`  [${cd.domain} / ${cd.category}]`);
        cd.descriptors.forEach((d) => lines.push(`    • ${d}`));
      }
      lines.push(``);
    }
  }

  // ── Grammar Inventory ───────────────────────────────────────────────────────
  if (includeGrammar && (skill === "grammar" || skill === "writing" || skill === "reading" || !skill)) {
    const grammar = GRAMMAR_INVENTORY[level];
    if (grammar) {
      lines.push(`── GRAMMAR INVENTORY (${level}) ──`);
      lines.push(`  PRODUCTIVE (tested in items at this level):`);
      grammar.productive.forEach((f) =>
        lines.push(`    • ${f.feature}: ${f.description}${f.exampleStem ? ` | e.g. "${f.exampleStem}"` : ""}`)
      );
      if (grammar.receptive.length > 0) {
        lines.push(`  RECEPTIVE ONLY (not in productive items):`);
        grammar.receptive.forEach((f) => lines.push(`    • ${f.feature}: ${f.description}`));
      }
      if (grammar.notYet.length > 0) {
        lines.push(`  NOT YET IN SCOPE (do NOT include in items): ${grammar.notYet.join(", ")}`);
      }
      lines.push(``);
    }
  }

  // ── Vocabulary Bands ────────────────────────────────────────────────────────
  if (includeVocabulary) {
    const vocab = VOCABULARY_BANDS[level];
    if (vocab) {
      lines.push(`── VOCABULARY SPECIFICATION (${level}) ──`);
      lines.push(`  Productive word families: ~${vocab.productiveWordFamilies}`);
      lines.push(`  Receptive word families:  ~${vocab.receptiveWordFamilies}`);
      lines.push(`  Reference list: ${vocab.ngslBand}`);
      lines.push(`  Minimum Zipf frequency in stimulus: ${vocab.minZipfStimulus} (higher = more common)`);
      lines.push(`  Academic vocabulary: ${vocab.academicVocab}`);
      lines.push(`  Idiomatic language: ${vocab.idioms}`);
      lines.push(`  Sample target vocabulary: ${vocab.wordExamples.slice(0, 10).join(", ")}`);
      if (vocab.avoidInItems.length > 0) {
        lines.push(`  AVOID in items (too difficult): ${vocab.avoidInItems.slice(0, 8).join(", ")}`);
      }
      lines.push(``);
    }
  }

  // ── Text Complexity ─────────────────────────────────────────────────────────
  if (includeTextComplexity) {
    const tc = TEXT_COMPLEXITY[level];
    if (tc) {
      lines.push(`── TEXT COMPLEXITY TARGETS (${level}) ──`);
      lines.push(`  Avg sentence length: ${tc.avgSentenceLength.min}–${tc.avgSentenceLength.max} words`);
      lines.push(`  Max clauses per sentence: ${tc.maxClausesPerSentence}`);
      if (skill === "reading" || !skill) {
        lines.push(`  Reading passage length: ${tc.readingPassageLength.min}–${tc.readingPassageLength.max} words`);
      }
      if (skill === "listening" || !skill) {
        lines.push(`  Listening transcript length: ${tc.listeningTranscriptLength.min}–${tc.listeningTranscriptLength.max} words`);
      }
      lines.push(`  Flesch-Kincaid grade: ${tc.fleschKincaidGrade.min}–${tc.fleschKincaidGrade.max}`);
      lines.push(`  Key text features: ${tc.textFeatures.join(" | ")}`);
      lines.push(``);
    }
  }

  // ── Error Profile ───────────────────────────────────────────────────────────
  if (includeErrorProfile) {
    const ep = ERROR_PROFILES[level];
    if (ep) {
      lines.push(`── TYPICAL LEARNER ERRORS AT ${level} (USE FOR DISTRACTOR DESIGN) ──`);
      lines.push(`  Grammar errors (make plausible distractors from these):`);
      ep.grammarErrors.slice(0, 5).forEach((e) =>
        lines.push(`    • [${e.frequency}] "${e.example}" → correct: "${e.targetForm}"`)
      );
      lines.push(`  Vocabulary errors:`);
      ep.vocabularyErrors.slice(0, 3).forEach((e) =>
        lines.push(`    • [${e.frequency}] "${e.example}" → correct: "${e.targetForm}"`)
      );
      lines.push(``);
    }
  }

  // ── Discourse Profile ───────────────────────────────────────────────────────
  if (includeDiscourse && (skill === "writing" || skill === "speaking" || !skill)) {
    const dp = DISCOURSE_PROFILES[level];
    if (dp) {
      lines.push(`── DISCOURSE & PRAGMATIC COMPETENCE (${level}) ──`);
      lines.push(`  Expected connectors/markers: ${dp.productiveMarkers.slice(0, 12).join(", ")}`);
      lines.push(`  Hedging language: ${dp.hedges.slice(0, 4).join(" | ")}`);
      lines.push(`  Pragmatic functions: ${dp.pragmaticFunctions.slice(0, 5).join(", ")}`);
      lines.push(``);
    }
  }

  // ── Topic Suitability ───────────────────────────────────────────────────────
  const tp = TOPIC_PROFILES[level];
  if (tp) {
    const topicList = [
      ...tp.coreTopics,
      ...(ageGroup === "adult" ? tp.adultTopics : []),
      ...(ageGroup === "junior" ? tp.juniorTopics : []),
      ...(ageGroup === "primary" ? tp.primaryTopics : []),
    ];
    lines.push(`── APPROPRIATE TOPICS FOR ${level} (age: ${ageGroup}) ──`);
    lines.push(`  ✓ Use: ${topicList.slice(0, 8).join(", ")}`);
    if (tp.avoidTopics.length > 0) {
      lines.push(`  ✗ Avoid: ${tp.avoidTopics.slice(0, 5).join(", ")}`);
    }
    lines.push(``);
  }

  return lines.join("\n");
}

/**
 * Build a scoring-focused CEFR knowledge block for writing/speaking AI scoring.
 */
export function buildCefrScoringKnowledge(level: CefrLevel, domain: "writing" | "speaking"): string {
  const grammar = GRAMMAR_INVENTORY[level];
  const vocab = VOCABULARY_BANDS[level];
  const discourse = DISCOURSE_PROFILES[level];
  const errorProfile = ERROR_PROFILES[level];
  const canDo = EXTENDED_CAN_DO.filter((d) => d.level === level && d.domain === domain);

  const lines: string[] = [
    `╔══════════════════════════════════════════════════════════════╗`,
    `  CEFR SCORING REFERENCE — Level: ${level}, Skill: ${domain.toUpperCase()}`,
    `╚══════════════════════════════════════════════════════════════╝`,
    ``,
    `WHAT A ${level} ${domain.toUpperCase()} RESPONSE LOOKS LIKE:`,
  ];

  canDo.forEach((cd) => cd.descriptors.forEach((d) => lines.push(`  • ${d}`)));
  lines.push(``);

  if (grammar) {
    lines.push(`GRAMMAR ACCURACY EXPECTED AT ${level}:`);
    lines.push(`  COMMAND of: ${grammar.productive.slice(0, 6).map((f) => f.feature).join(", ")}`);
    lines.push(`  NOT YET EXPECTED: ${grammar.notYet.slice(0, 5).join(", ")}`);
    lines.push(``);
  }

  if (vocab) {
    lines.push(`VOCABULARY RANGE AT ${level}:`);
    lines.push(`  ~${vocab.productiveWordFamilies} productive word families`);
    lines.push(`  Academic vocab: ${vocab.academicVocab} | Idioms: ${vocab.idioms}`);
    lines.push(`  Sample target words: ${vocab.wordExamples.slice(0, 8).join(", ")}`);
    lines.push(``);
  }

  if (discourse) {
    lines.push(`DISCOURSE & COHERENCE EXPECTED AT ${level}:`);
    lines.push(`  Connectors used: ${discourse.productiveMarkers.slice(0, 8).join(", ")}`);
    lines.push(`  Hedging: ${discourse.hedges.slice(0, 3).join(" | ")}`);
    lines.push(``);
  }

  if (errorProfile) {
    lines.push(`EXPECTED ERROR TYPES (inform scoring tolerance):`);
    errorProfile.grammarErrors.slice(0, 4).forEach((e) =>
      lines.push(`  • [${e.frequency}] ${e.error}: "${e.example}" → "${e.targetForm}"`)
    );
    lines.push(``);
  }

  lines.push(`SCORING PRINCIPLE:`);
  lines.push(`  Score the response AGAINST the ${level} level benchmark.`);
  lines.push(`  If the response clearly exceeds ${level}, award the ceiling score and flag as potentially above-level.`);
  lines.push(`  If the response is below ${level}, reflect this in both the numeric score and the cefrLevel field.`);
  lines.push(`  Common errors at this level (listed above) should receive partial credit, not full penalisation.`);

  return lines.join("\n");
}

/**
 * Quick lookup: what grammar structures are appropriate to TEST at a given level?
 */
export function getTestableGrammar(level: CefrLevel): string[] {
  return GRAMMAR_INVENTORY[level]?.productive.map((f) => f.feature) ?? [];
}

/**
 * Get all grammar structures explicitly out of scope for a given level.
 */
export function getOutOfScopeGrammar(level: CefrLevel): string[] {
  return GRAMMAR_INVENTORY[level]?.notYet ?? [];
}

/**
 * Get vocabulary constraints for item writing at a given level.
 */
export function getVocabConstraints(level: CefrLevel) {
  return VOCABULARY_BANDS[level];
}

/**
 * Get text complexity targets for a given level and skill.
 */
export function getTextComplexity(level: CefrLevel): TextComplexity {
  return TEXT_COMPLEXITY[level];
}

/**
 * Get most common errors at a given level (for distractor design).
 */
export function getCommonErrors(level: CefrLevel): ErrorType[] {
  const ep = ERROR_PROFILES[level];
  return [...(ep?.grammarErrors ?? []), ...(ep?.vocabularyErrors ?? [])];
}
