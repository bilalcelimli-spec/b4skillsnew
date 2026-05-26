/**
 * Domain Modules — Business / Academic / Healthcare English
 * ─────────────────────────────────────────────────────────────────────────────
 * Each module defines:
 *   • Construct map (what is being measured)
 *   • Topic/domain vocabulary clusters
 *   • Item format specifications by skill
 *   • Minimum item bank targets per CEFR level
 *   • Scoring rubrics adapted for domain
 *   • Reference corpora and task types
 *
 * Used by the expansion engine to guide AI item generation with
 * domain-appropriate contexts and vocabulary.
 */

export type DomainModule = "GENERAL" | "BUSINESS" | "ACADEMIC" | "HEALTHCARE";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DomainSpec {
  module: DomainModule;
  displayName: string;
  description: string;
  targetAudience: string[];
  referenceFrameworks: string[];
  targetItemsPerLevel: Record<string, number>;  // CEFR → item count
  skills: Record<string, DomainSkillSpec>;
  vocabularyClusters: VocabularyCluster[];
  taskTypes: string[];
  scoringAdaptations: string[];
}

export interface DomainSkillSpec {
  formats: string[];
  taskDescriptions: string[];
  textTypes: string[];
  maxWordCount?: number;
  speakingPromptTypes?: string[];
}

export interface VocabularyCluster {
  cluster: string;
  items: string[];
  cefrLevel: string;
}

// ── Domain specifications ─────────────────────────────────────────────────────

export const BUSINESS_ENGLISH: DomainSpec = {
  module: "BUSINESS",
  displayName: "Business English",
  description: "Professional English for workplace communication, finance, management, and international trade.",
  targetAudience: ["Corporate professionals", "MBA students", "Finance/banking candidates", "HR and management"],
  referenceFrameworks: ["BULATS", "LCCI English for Business", "BEC (Cambridge Business English Certificate)", "TOEIC"],
  targetItemsPerLevel: { A1: 200, A2: 500, B1: 1200, B2: 1800, C1: 1200, C2: 600 },
  skills: {
    READING: {
      formats: ["MULTIPLE_CHOICE", "MATCHING", "GAP_FILL"],
      taskDescriptions: [
        "Read a company memo and answer comprehension questions",
        "Extract key data from a financial report or chart",
        "Identify the main purpose of a business email",
        "Match headings to paragraphs in a market analysis",
      ],
      textTypes: ["Business email", "Company report", "Press release", "Job advertisement", "Contract clause", "Meeting agenda"],
    },
    LISTENING: {
      formats: ["MULTIPLE_CHOICE", "NOTE_COMPLETION"],
      taskDescriptions: [
        "Listen to a business meeting and identify decisions made",
        "Complete notes from a telephone call or voicemail",
        "Identify the speaker's attitude in a negotiation",
      ],
      textTypes: ["Meeting recording", "Telephone call", "Conference presentation", "Job interview"],
    },
    WRITING: {
      formats: ["OPEN_RESPONSE"],
      taskDescriptions: [
        "Write a formal business email responding to a complaint",
        "Compose a short report based on provided data",
        "Draft meeting minutes from bullet-point notes",
        "Write a proposal for a new business initiative",
      ],
      textTypes: ["Email", "Short report", "Memo", "Meeting minutes", "Proposal"],
      maxWordCount: 250,
    },
    SPEAKING: {
      formats: ["OPEN_RESPONSE"],
      taskDescriptions: [
        "Give a 90-second presentation on a business topic",
        "Role-play a telephone negotiation",
        "Describe a business chart or graph",
      ],
      textTypes: ["Presentation prompt", "Role-play scenario", "Chart description"],
      speakingPromptTypes: ["Presentation", "Role-play", "Chart description", "Discussion"],
    },
    GRAMMAR: {
      formats: ["MULTIPLE_CHOICE", "GAP_FILL"],
      taskDescriptions: [
        "Complete a business email with correct verb forms",
        "Choose the appropriate formal register",
        "Identify errors in a business report extract",
      ],
      textTypes: ["Email extract", "Report sentence", "Meeting transcript"],
    },
    VOCABULARY: {
      formats: ["MULTIPLE_CHOICE", "MATCHING"],
      taskDescriptions: [
        "Select the correct business term in context",
        "Match financial vocabulary to definitions",
        "Identify synonyms for common business expressions",
      ],
      textTypes: ["Business sentence", "Definition", "Short paragraph"],
    },
  },
  vocabularyClusters: [
    { cluster: "Finance & Banking", cefrLevel: "B1", items: ["invoice", "revenue", "budget", "profit", "loss", "cash flow", "equity", "dividend", "liquidity", "audit"] },
    { cluster: "Management", cefrLevel: "B1", items: ["stakeholder", "KPI", "benchmark", "outsource", "delegate", "strategy", "objective", "performance review"] },
    { cluster: "Trade & Commerce", cefrLevel: "B2", items: ["procurement", "logistics", "tariff", "compliance", "due diligence", "tender", "supply chain", "B2B"] },
    { cluster: "HR & Recruitment", cefrLevel: "A2", items: ["candidate", "vacancy", "shortlist", "onboarding", "appraisal", "redundancy", "maternity leave"] },
    { cluster: "Advanced Business", cefrLevel: "C1", items: ["synergy", "monetise", "scalability", "fiduciary", "arbitrage", "derivatives", "hedge fund", "IPO"] },
  ],
  taskTypes: ["Reading comprehension", "Email writing", "Report writing", "Meeting role-play", "Presentation", "Data interpretation"],
  scoringAdaptations: [
    "Register appropriateness weighted at 20% in writing rubric",
    "Professional vocabulary range assessed separately",
    "Spoken fluency judged against business meeting norms",
  ],
};

export const ACADEMIC_ENGLISH: DomainSpec = {
  module: "ACADEMIC",
  displayName: "Academic English",
  description: "English for university study, research, and scholarly communication (IELTS/TOEFL aligned).",
  targetAudience: ["University applicants", "Graduate students", "Researchers", "Academic staff"],
  referenceFrameworks: ["IELTS Academic", "TOEFL iBT", "Cambridge C1 Advanced/C2 Proficiency", "TEAP"],
  targetItemsPerLevel: { A1: 100, A2: 300, B1: 1000, B2: 2000, C1: 2000, C2: 1200 },
  skills: {
    READING: {
      formats: ["MULTIPLE_CHOICE", "TRUE_FALSE_NOT_GIVEN", "MATCHING_HEADINGS", "SHORT_ANSWER"],
      taskDescriptions: [
        "Read an academic article and answer inference questions",
        "Identify the author's argument and supporting evidence",
        "Match section headings to paragraphs",
        "Determine whether statements agree with the text (T/F/NG)",
      ],
      textTypes: ["Academic journal article", "University textbook extract", "Scientific report", "Review article"],
    },
    LISTENING: {
      formats: ["MULTIPLE_CHOICE", "NOTE_COMPLETION", "DIAGRAM_LABEL"],
      taskDescriptions: [
        "Follow a university lecture and complete notes",
        "Identify a speaker's purpose in a seminar discussion",
        "Complete a diagram from a lecture on a scientific process",
      ],
      textTypes: ["University lecture", "Seminar discussion", "Tutorial", "Academic podcast"],
    },
    WRITING: {
      formats: ["OPEN_RESPONSE"],
      taskDescriptions: [
        "Summarise and evaluate the main ideas from two reading passages",
        "Write an academic essay presenting arguments for and against a position",
        "Describe data from a graph, table, or chart (Task 1)",
        "Argue for a position using evidence from academic sources (Task 2)",
      ],
      textTypes: ["Academic essay", "Report", "Summary/evaluation", "Data description"],
      maxWordCount: 400,
    },
    SPEAKING: {
      formats: ["OPEN_RESPONSE"],
      taskDescriptions: [
        "Give a 2-minute academic presentation on a provided topic",
        "Respond to follow-up questions on an academic topic",
        "Discuss two opposing academic viewpoints",
      ],
      textTypes: ["Presentation prompt", "Academic discussion prompt", "Opinion question"],
      speakingPromptTypes: ["Prepared talk", "Academic discussion", "Opinion question", "Problem-solution"],
    },
    GRAMMAR: {
      formats: ["MULTIPLE_CHOICE", "ERROR_IDENTIFICATION"],
      taskDescriptions: [
        "Identify grammatical errors in an academic paragraph",
        "Choose the correct passive construction in a methods section",
        "Complete a hedging expression in an academic context",
      ],
      textTypes: ["Academic sentence", "Journal extract", "Abstract"],
    },
    VOCABULARY: {
      formats: ["MULTIPLE_CHOICE", "MATCHING", "CLOZE"],
      taskDescriptions: [
        "Select the correct Academic Word List (AWL) item in context",
        "Match academic collocations to sentences",
        "Complete an abstract using AWL vocabulary",
      ],
      textTypes: ["Academic sentence", "Abstract extract", "Definition"],
    },
  },
  vocabularyClusters: [
    { cluster: "Academic Word List (AWL) Sublist 1", cefrLevel: "B1", items: ["analysis", "approach", "area", "assessment", "assume", "authority", "available", "benefit", "concept", "consistent"] },
    { cluster: "Research Methods", cefrLevel: "B2", items: ["hypothesis", "variable", "methodology", "qualitative", "quantitative", "sample size", "validity", "reliability", "correlation", "replication"] },
    { cluster: "Critical Thinking", cefrLevel: "C1", items: ["substantiate", "contradict", "infer", "nuance", "juxtapose", "exemplify", "synthesise", "delineate", "premises"] },
    { cluster: "Hedging Language", cefrLevel: "B2", items: ["arguably", "seemingly", "indicates", "suggests", "appears to", "may be", "could be", "tends to"] },
  ],
  taskTypes: ["Essay writing", "Data description", "Lecture note-taking", "Summary/evaluation", "Academic discussion"],
  scoringAdaptations: [
    "Task Achievement: addressing all parts of the prompt weighted at 25%",
    "Coherence & Cohesion: logical flow and paragraph organisation at 25%",
    "Lexical Resource: AWL range and collocation accuracy at 25%",
    "Grammatical Range & Accuracy: complex sentences and error density at 25%",
  ],
};

export const HEALTHCARE_ENGLISH: DomainSpec = {
  module: "HEALTHCARE",
  displayName: "Healthcare English",
  description: "English for medical and nursing professionals: patient communication, clinical documentation, handover.",
  targetAudience: ["Nurses", "Doctors", "Allied health professionals", "Medical students", "Healthcare administrators"],
  referenceFrameworks: ["OET (Occupational English Test)", "BEC Healthcare", "IELTS Healthcare pathway"],
  targetItemsPerLevel: { A1: 50, A2: 200, B1: 800, B2: 1500, C1: 1000, C2: 400 },
  skills: {
    READING: {
      formats: ["MULTIPLE_CHOICE", "MATCHING", "SHORT_ANSWER"],
      taskDescriptions: [
        "Read a patient case note and answer clinical comprehension questions",
        "Identify the key information in a medication instruction",
        "Match medical abbreviations to their meanings",
      ],
      textTypes: ["Case note", "Discharge summary", "Clinical guideline", "Patient information leaflet", "Drug monograph"],
    },
    LISTENING: {
      formats: ["MULTIPLE_CHOICE", "NOTE_COMPLETION"],
      taskDescriptions: [
        "Listen to a clinical handover and identify patient status",
        "Extract key information from a GP-to-specialist referral call",
        "Complete a patient intake form from a recorded consultation",
      ],
      textTypes: ["Clinical handover", "Patient consultation", "Multidisciplinary team meeting", "Phone referral"],
    },
    WRITING: {
      formats: ["OPEN_RESPONSE"],
      taskDescriptions: [
        "Write a referral letter based on provided case notes",
        "Complete a patient transfer summary",
        "Write discharge instructions for a patient in plain language",
      ],
      textTypes: ["Referral letter", "Discharge summary", "Transfer note", "Patient communication"],
      maxWordCount: 200,
    },
    SPEAKING: {
      formats: ["OPEN_RESPONSE"],
      taskDescriptions: [
        "Role-play a patient consultation: take a medical history",
        "Explain a diagnosis to a patient using plain language",
        "Give a SBAR-format clinical handover",
      ],
      textTypes: ["Clinical scenario", "Patient consultation prompt", "Handover prompt"],
      speakingPromptTypes: ["Patient consultation", "Clinical handover", "Patient education", "Team discussion"],
    },
    GRAMMAR: {
      formats: ["MULTIPLE_CHOICE", "GAP_FILL"],
      taskDescriptions: [
        "Complete a clinical note with correct tense usage",
        "Choose appropriate reported speech for patient statements",
        "Select the correct passive voice in a clinical context",
      ],
      textTypes: ["Clinical note sentence", "Referral letter extract", "Handover transcript"],
    },
    VOCABULARY: {
      formats: ["MULTIPLE_CHOICE", "MATCHING"],
      taskDescriptions: [
        "Select the correct clinical term for a described condition",
        "Match medical abbreviations to full forms",
        "Choose the appropriate plain-language equivalent for a medical term",
      ],
      textTypes: ["Clinical sentence", "Medical definition", "Patient scenario"],
    },
  },
  vocabularyClusters: [
    { cluster: "Clinical Terms (Common)", cefrLevel: "B1", items: ["diagnosis", "prognosis", "symptom", "vital signs", "triage", "assessment", "monitoring", "intervention", "discharge"] },
    { cluster: "Medications & Dosage", cefrLevel: "B2", items: ["contraindication", "adverse reaction", "analgesic", "anticoagulant", "titration", "subcutaneous", "intravenous", "prophylaxis"] },
    { cluster: "Patient Communication", cefrLevel: "B1", items: ["informed consent", "patient advocate", "palliative", "empathy", "active listening", "rapport", "follow-up"] },
    { cluster: "Advanced Clinical", cefrLevel: "C1", items: ["aetiology", "pathophysiology", "differential diagnosis", "comorbidity", "sequelae", "iatrogenic", "nosocomial"] },
    { cluster: "Abbreviations", cefrLevel: "B2", items: ["SBAR", "PRN", "NPO", "STAT", "SOB", "BP", "HR", "SpO2", "GCS", "APGAR"] },
  ],
  taskTypes: ["Referral letter", "Patient consultation role-play", "Clinical handover", "Discharge summary", "Patient education"],
  scoringAdaptations: [
    "Plain language for patient communication weighted separately from clinical terminology",
    "SBAR structure assessed in speaking handover tasks",
    "Empathy and professional register scored in consultation role-plays",
    "Clinical accuracy of terminology validated against medical dictionaries",
  ],
};

// ── Module registry ───────────────────────────────────────────────────────────

export const DOMAIN_MODULES: Record<Exclude<DomainModule, "GENERAL">, DomainSpec> = {
  BUSINESS: BUSINESS_ENGLISH,
  ACADEMIC: ACADEMIC_ENGLISH,
  HEALTHCARE: HEALTHCARE_ENGLISH,
};

export function getDomainSpec(module: DomainModule): DomainSpec | null {
  if (module === "GENERAL") return null;
  return DOMAIN_MODULES[module] ?? null;
}

/** Generate item generation prompt guidance for a given domain/skill/level */
export function buildGenerationPrompt(module: DomainModule, skill: string, cefrLevel: string): string {
  const spec = getDomainSpec(module);
  if (!spec) return `Generate a ${skill} item at ${cefrLevel} level.`;

  const skillSpec = spec.skills[skill];
  const vocabCluster = spec.vocabularyClusters.find((v) => v.cefrLevel === cefrLevel);
  const textType = skillSpec?.textTypes?.[Math.floor(Math.random() * (skillSpec.textTypes?.length ?? 1))] ?? "";
  const taskDesc = skillSpec?.taskDescriptions?.[Math.floor(Math.random() * skillSpec.taskDescriptions.length)] ?? "";

  return [
    `Domain: ${spec.displayName}`,
    `Skill: ${skill} | CEFR Level: ${cefrLevel}`,
    `Task: ${taskDesc}`,
    textType ? `Text type: ${textType}` : "",
    vocabCluster ? `Incorporate vocabulary from cluster "${vocabCluster.cluster}": ${vocabCluster.items.slice(0, 5).join(", ")}` : "",
    `Scoring: ${spec.scoringAdaptations[0] ?? ""}`,
  ].filter(Boolean).join("\n");
}
