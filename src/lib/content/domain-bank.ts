/**
 * Domain-Specific Item Bank Configuration
 * 
 * Supports specialized assessments beyond General English:
 * - Academic English (IELTS Academic style)
 * - Business English (BEC/BULATS style)
 * - Medical English
 * - Aviation English (ICAO)
 * - IT/Technical English
 * 
 * Each domain has its own content blueprint, vocabulary lists,
 * and CEFR-aligned content specifications.
 */

import { SkillType, BlueprintConstraint } from "../assessment-engine/types";

export interface DomainConfig {
  id: string;
  name: string;
  description: string;
  /** Content blueprint specific to this domain */
  blueprint: BlueprintConstraint[];
  /** Domain-specific vocabulary requirements per CEFR level */
  vocabularySpecs: Record<string, {
    topicAreas: string[];
    minWordCount: number;
    maxWordCount: number;
    registerLevel: "informal" | "semi-formal" | "formal" | "academic" | "technical";
  }>;
  /** Content specifications per skill per CEFR level */
  contentSpecs: Record<string, Record<string, {
    topics: string[];
    textTypes: string[];
    wordRange: [number, number];
    features: string[];
  }>>;
  /** Tags to filter items from the bank */
  itemTags: string[];
  /** Minimum items needed in bank for this domain */
  minBankSize: number;
}

export const DOMAIN_CONFIGS: Record<string, DomainConfig> = {
  GENERAL: {
    id: "GENERAL",
    name: "General English",
    description: "Comprehensive English proficiency assessment across all domains",
    blueprint: [
      { skill: SkillType.READING, minCount: 2, maxCount: 4 },
      { skill: SkillType.GRAMMAR, minCount: 2, maxCount: 4 },
      { skill: SkillType.VOCABULARY, minCount: 2, maxCount: 3 },
      { skill: SkillType.LISTENING, minCount: 1, maxCount: 3 },
      { skill: SkillType.WRITING, minCount: 1, maxCount: 2 },
      { skill: SkillType.SPEAKING, minCount: 1, maxCount: 2 },
    ],
    vocabularySpecs: {
      A1: { topicAreas: ["self", "family", "daily routines", "food", "weather"], minWordCount: 500, maxWordCount: 1000, registerLevel: "informal" },
      A2: { topicAreas: ["shopping", "travel", "health", "hobbies", "work"], minWordCount: 1000, maxWordCount: 2000, registerLevel: "informal" },
      B1: { topicAreas: ["education", "media", "environment", "technology", "culture"], minWordCount: 2000, maxWordCount: 3500, registerLevel: "semi-formal" },
      B2: { topicAreas: ["society", "politics", "science", "arts", "current affairs"], minWordCount: 3500, maxWordCount: 5000, registerLevel: "formal" },
      C1: { topicAreas: ["philosophy", "economics", "psychology", "law", "research"], minWordCount: 5000, maxWordCount: 8000, registerLevel: "academic" },
      C2: { topicAreas: ["any domain", "specialized discourse", "nuanced argumentation"], minWordCount: 8000, maxWordCount: 15000, registerLevel: "academic" },
    },
    contentSpecs: {},
    itemTags: ["general"],
    minBankSize: 200,
  },

  ACADEMIC: {
    id: "ACADEMIC",
    name: "Academic English",
    description: "University-level academic English proficiency (IELTS Academic equivalent)",
    blueprint: [
      { skill: SkillType.READING, minCount: 3, maxCount: 5 },
      { skill: SkillType.LISTENING, minCount: 2, maxCount: 4 },
      { skill: SkillType.WRITING, minCount: 2, maxCount: 3 },
      { skill: SkillType.SPEAKING, minCount: 1, maxCount: 2 },
      { skill: SkillType.GRAMMAR, minCount: 1, maxCount: 2 },
      { skill: SkillType.VOCABULARY, minCount: 1, maxCount: 2 },
    ],
    vocabularySpecs: {
      B1: { topicAreas: ["academic study skills", "campus life", "lectures", "textbooks"], minWordCount: 2500, maxWordCount: 4000, registerLevel: "semi-formal" },
      B2: { topicAreas: ["research methods", "academic writing", "critical analysis", "presentations"], minWordCount: 4000, maxWordCount: 6000, registerLevel: "academic" },
      C1: { topicAreas: ["literature review", "thesis argumentation", "academic debate", "publication"], minWordCount: 6000, maxWordCount: 10000, registerLevel: "academic" },
      C2: { topicAreas: ["advanced research discourse", "interdisciplinary analysis", "peer review"], minWordCount: 10000, maxWordCount: 20000, registerLevel: "academic" },
    },
    contentSpecs: {
      READING: {
        B2: { topics: ["scientific articles", "humanities texts", "social science reports"], textTypes: ["journal abstract", "textbook excerpt", "research report"], wordRange: [300, 500], features: ["academic vocabulary", "complex sentences", "hedging language"] },
        C1: { topics: ["multidisciplinary research", "theoretical frameworks", "methodology"], textTypes: ["journal article", "review paper", "dissertation excerpt"], wordRange: [400, 700], features: ["discipline-specific terminology", "rhetorical structures", "citation conventions"] },
      },
      WRITING: {
        B2: { topics: ["essay writing", "report writing"], textTypes: ["argumentative essay", "compare/contrast", "process description"], wordRange: [200, 300], features: ["thesis statement", "topic sentences", "supporting evidence", "academic register"] },
        C1: { topics: ["critical analysis", "research proposal"], textTypes: ["synthesis essay", "literature review", "proposal"], wordRange: [300, 400], features: ["nuanced argumentation", "source integration", "academic conventions"] },
      },
    },
    itemTags: ["academic", "university", "ielts-academic"],
    minBankSize: 300,
  },

  BUSINESS: {
    id: "BUSINESS",
    name: "Business English",
    description: "Professional and workplace English proficiency (BEC/BULATS equivalent)",
    blueprint: [
      { skill: SkillType.READING, minCount: 2, maxCount: 4 },
      { skill: SkillType.LISTENING, minCount: 2, maxCount: 4 },
      { skill: SkillType.WRITING, minCount: 2, maxCount: 3 },
      { skill: SkillType.SPEAKING, minCount: 2, maxCount: 3 },
      { skill: SkillType.GRAMMAR, minCount: 1, maxCount: 2 },
      { skill: SkillType.VOCABULARY, minCount: 1, maxCount: 2 },
    ],
    vocabularySpecs: {
      B1: { topicAreas: ["office basics", "meetings", "emails", "schedules", "travel"], minWordCount: 2000, maxWordCount: 3500, registerLevel: "semi-formal" },
      B2: { topicAreas: ["negotiations", "presentations", "reports", "marketing", "HR"], minWordCount: 3500, maxWordCount: 5500, registerLevel: "formal" },
      C1: { topicAreas: ["strategy", "finance", "leadership", "M&A", "compliance"], minWordCount: 5500, maxWordCount: 9000, registerLevel: "formal" },
    },
    contentSpecs: {
      LISTENING: {
        B1: { topics: ["phone calls", "meetings", "instructions"], textTypes: ["dialogue", "voicemail", "announcement"], wordRange: [100, 200], features: ["workplace context", "polite forms", "clarification requests"] },
        B2: { topics: ["presentations", "negotiations", "conferences"], textTypes: ["presentation", "interview", "discussion"], wordRange: [200, 350], features: ["business idioms", "formal register", "persuasion"] },
      },
      WRITING: {
        B1: { topics: ["emails", "memos", "short reports"], textTypes: ["email", "memo", "message"], wordRange: [80, 150], features: ["appropriate tone", "clear purpose", "action items"] },
        B2: { topics: ["proposals", "reports", "formal correspondence"], textTypes: ["business report", "proposal", "formal letter"], wordRange: [200, 300], features: ["executive summary", "data analysis", "recommendations"] },
      },
    },
    itemTags: ["business", "professional", "corporate"],
    minBankSize: 250,
  },

  MEDICAL: {
    id: "MEDICAL",
    name: "Medical English",
    description: "Healthcare and medical profession English proficiency",
    blueprint: [
      { skill: SkillType.READING, minCount: 3, maxCount: 5 },
      { skill: SkillType.LISTENING, minCount: 2, maxCount: 4 },
      { skill: SkillType.SPEAKING, minCount: 2, maxCount: 3 },
      { skill: SkillType.WRITING, minCount: 1, maxCount: 2 },
      { skill: SkillType.VOCABULARY, minCount: 2, maxCount: 3 },
      { skill: SkillType.GRAMMAR, minCount: 1, maxCount: 2 },
    ],
    vocabularySpecs: {
      B2: { topicAreas: ["anatomy", "symptoms", "diagnosis", "patient communication", "medication"], minWordCount: 4000, maxWordCount: 7000, registerLevel: "technical" },
      C1: { topicAreas: ["medical research", "clinical trials", "specialist referral", "case presentation"], minWordCount: 7000, maxWordCount: 12000, registerLevel: "technical" },
    },
    contentSpecs: {},
    itemTags: ["medical", "healthcare", "clinical"],
    minBankSize: 200,
  },

  AVIATION: {
    id: "AVIATION",
    name: "Aviation English",
    description: "ICAO-compliant aviation English proficiency assessment",
    blueprint: [
      { skill: SkillType.LISTENING, minCount: 4, maxCount: 6 },
      { skill: SkillType.SPEAKING, minCount: 3, maxCount: 5 },
      { skill: SkillType.READING, minCount: 2, maxCount: 3 },
      { skill: SkillType.VOCABULARY, minCount: 2, maxCount: 3 },
      { skill: SkillType.GRAMMAR, minCount: 1, maxCount: 2 },
      { skill: SkillType.WRITING, minCount: 0, maxCount: 1 },
    ],
    vocabularySpecs: {
      B1: { topicAreas: ["ATC communication", "weather reports", "emergency procedures", "navigation"], minWordCount: 1500, maxWordCount: 3000, registerLevel: "technical" },
      B2: { topicAreas: ["non-routine situations", "technical descriptions", "pilot-ATC interaction"], minWordCount: 3000, maxWordCount: 5000, registerLevel: "technical" },
    },
    contentSpecs: {},
    itemTags: ["aviation", "icao", "pilot"],
    minBankSize: 150,
  },

  IT: {
    id: "IT",
    name: "IT/Technical English",
    description: "Information technology and software engineering English proficiency",
    blueprint: [
      { skill: SkillType.READING, minCount: 3, maxCount: 5 },
      { skill: SkillType.WRITING, minCount: 2, maxCount: 3 },
      { skill: SkillType.VOCABULARY, minCount: 2, maxCount: 3 },
      { skill: SkillType.LISTENING, minCount: 1, maxCount: 3 },
      { skill: SkillType.SPEAKING, minCount: 1, maxCount: 2 },
      { skill: SkillType.GRAMMAR, minCount: 1, maxCount: 2 },
    ],
    vocabularySpecs: {
      B1: { topicAreas: ["hardware basics", "software types", "internet", "email", "troubleshooting"], minWordCount: 2000, maxWordCount: 3500, registerLevel: "semi-formal" },
      B2: { topicAreas: ["system architecture", "databases", "networking", "security", "agile"], minWordCount: 3500, maxWordCount: 6000, registerLevel: "technical" },
      C1: { topicAreas: ["cloud computing", "AI/ML", "DevOps", "system design", "technical writing"], minWordCount: 6000, maxWordCount: 10000, registerLevel: "technical" },
    },
    contentSpecs: {},
    itemTags: ["it", "technology", "software", "engineering"],
    minBankSize: 200,
  },
};

/**
 * Get domain config by ID
 */
export function getDomainConfig(domainId: string): DomainConfig | undefined {
  return DOMAIN_CONFIGS[domainId];
}

/**
 * Get all available domains
 */
export function getAllDomains(): DomainConfig[] {
  return Object.values(DOMAIN_CONFIGS);
}

/**
 * Get content spec for a specific domain, skill, and CEFR level
 */
export function getContentSpec(domainId: string, skill: string, cefrLevel: string) {
  const domain = DOMAIN_CONFIGS[domainId];
  if (!domain) return null;
  return domain.contentSpecs[skill]?.[cefrLevel] || null;
}
