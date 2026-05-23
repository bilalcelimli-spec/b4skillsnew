/**
 * b4skills Cultural Adaptation Framework
 * Hofstede-based cultural profiles, learning style preferences,
 * and content restriction policies per region.
 */

export interface CulturalValues {
  individualismIndex: number;    // 0-100
  powerDistance: number;         // 0-100
  uncertaintyAvoidance: number;  // 0-100
  longTermOrientation: number;   // 0-100
  indulgence: number;            // 0-100
}

export interface AssessmentPreferences {
  competitiveVsCollaborative: "competitive" | "collaborative" | "mixed";
  hierarchicalVsEqualitarian: "hierarchical" | "equalitarian";
  contextVsLinear: "high-context" | "low-context";
  timeOrientationMonochronic: boolean;
}

export interface ContentRestrictions {
  violenceTolerance: "high" | "medium" | "low";
  religionMentions: "allowed" | "minimal" | "none";
  genderRoles: "traditional" | "progressive" | "neutral";
  alcoholTobaccoAllowed: boolean;
  foodCulturalSensitivity: string[];
}

export interface CulturalContext {
  region: string;
  dialect: "british" | "american" | "australian" | "other";
  formalityLevel: "formal" | "neutral" | "informal";
  culturalValues: CulturalValues;
  assessmentPreferences: AssessmentPreferences;
  contentRestrictions: ContentRestrictions;
}

const CULTURAL_PROFILES: Record<string, CulturalContext> = {
  GB: {
    region: "GB", dialect: "british", formalityLevel: "neutral",
    culturalValues: { individualismIndex: 89, powerDistance: 35, uncertaintyAvoidance: 35, longTermOrientation: 51, indulgence: 69 },
    assessmentPreferences: { competitiveVsCollaborative: "mixed", hierarchicalVsEqualitarian: "equalitarian", contextVsLinear: "low-context", timeOrientationMonochronic: true },
    contentRestrictions: { violenceTolerance: "high", religionMentions: "allowed", genderRoles: "progressive", alcoholTobaccoAllowed: true, foodCulturalSensitivity: [] },
  },
  US: {
    region: "US", dialect: "american", formalityLevel: "informal",
    culturalValues: { individualismIndex: 91, powerDistance: 40, uncertaintyAvoidance: 46, longTermOrientation: 26, indulgence: 68 },
    assessmentPreferences: { competitiveVsCollaborative: "competitive", hierarchicalVsEqualitarian: "equalitarian", contextVsLinear: "low-context", timeOrientationMonochronic: true },
    contentRestrictions: { violenceTolerance: "medium", religionMentions: "minimal", genderRoles: "progressive", alcoholTobaccoAllowed: true, foodCulturalSensitivity: [] },
  },
  TR: {
    region: "TR", dialect: "other", formalityLevel: "formal",
    culturalValues: { individualismIndex: 37, powerDistance: 66, uncertaintyAvoidance: 85, longTermOrientation: 36, indulgence: 49 },
    assessmentPreferences: { competitiveVsCollaborative: "collaborative", hierarchicalVsEqualitarian: "hierarchical", contextVsLinear: "high-context", timeOrientationMonochronic: false },
    contentRestrictions: { violenceTolerance: "medium", religionMentions: "minimal", genderRoles: "traditional", alcoholTobaccoAllowed: false, foodCulturalSensitivity: ["halal"] },
  },
  DE: {
    region: "DE", dialect: "other", formalityLevel: "formal",
    culturalValues: { individualismIndex: 67, powerDistance: 35, uncertaintyAvoidance: 65, longTermOrientation: 83, indulgence: 40 },
    assessmentPreferences: { competitiveVsCollaborative: "mixed", hierarchicalVsEqualitarian: "equalitarian", contextVsLinear: "low-context", timeOrientationMonochronic: true },
    contentRestrictions: { violenceTolerance: "medium", religionMentions: "allowed", genderRoles: "progressive", alcoholTobaccoAllowed: true, foodCulturalSensitivity: [] },
  },
  FR: {
    region: "FR", dialect: "other", formalityLevel: "formal",
    culturalValues: { individualismIndex: 71, powerDistance: 68, uncertaintyAvoidance: 86, longTermOrientation: 63, indulgence: 48 },
    assessmentPreferences: { competitiveVsCollaborative: "mixed", hierarchicalVsEqualitarian: "hierarchical", contextVsLinear: "high-context", timeOrientationMonochronic: true },
    contentRestrictions: { violenceTolerance: "medium", religionMentions: "minimal", genderRoles: "progressive", alcoholTobaccoAllowed: true, foodCulturalSensitivity: [] },
  },
  CN: {
    region: "CN", dialect: "other", formalityLevel: "formal",
    culturalValues: { individualismIndex: 20, powerDistance: 80, uncertaintyAvoidance: 30, longTermOrientation: 87, indulgence: 24 },
    assessmentPreferences: { competitiveVsCollaborative: "mixed", hierarchicalVsEqualitarian: "hierarchical", contextVsLinear: "high-context", timeOrientationMonochronic: false },
    contentRestrictions: { violenceTolerance: "low", religionMentions: "none", genderRoles: "progressive", alcoholTobaccoAllowed: true, foodCulturalSensitivity: [] },
  },
  JP: {
    region: "JP", dialect: "other", formalityLevel: "formal",
    culturalValues: { individualismIndex: 46, powerDistance: 54, uncertaintyAvoidance: 92, longTermOrientation: 88, indulgence: 42 },
    assessmentPreferences: { competitiveVsCollaborative: "collaborative", hierarchicalVsEqualitarian: "hierarchical", contextVsLinear: "high-context", timeOrientationMonochronic: true },
    contentRestrictions: { violenceTolerance: "medium", religionMentions: "allowed", genderRoles: "traditional", alcoholTobaccoAllowed: true, foodCulturalSensitivity: [] },
  },
  BR: {
    region: "BR", dialect: "other", formalityLevel: "informal",
    culturalValues: { individualismIndex: 38, powerDistance: 69, uncertaintyAvoidance: 76, longTermOrientation: 44, indulgence: 59 },
    assessmentPreferences: { competitiveVsCollaborative: "collaborative", hierarchicalVsEqualitarian: "hierarchical", contextVsLinear: "high-context", timeOrientationMonochronic: false },
    contentRestrictions: { violenceTolerance: "high", religionMentions: "allowed", genderRoles: "progressive", alcoholTobaccoAllowed: true, foodCulturalSensitivity: [] },
  },
};

export function getCulturalContext(region: string): CulturalContext {
  return CULTURAL_PROFILES[region] ?? CULTURAL_PROFILES["GB"];
}

export function getAllCulturalProfiles(): Record<string, CulturalContext> {
  return CULTURAL_PROFILES;
}

export function getInstructionalStyle(ctx: CulturalContext): "direct" | "narrative" | "socratic" | "mixed" {
  if (ctx.assessmentPreferences.hierarchicalVsEqualitarian === "hierarchical") return "direct";
  if (ctx.assessmentPreferences.contextVsLinear === "high-context") return "narrative";
  if (ctx.culturalValues.uncertaintyAvoidance > 70) return "direct";
  return "mixed";
}

export function getFeedbackStyle(ctx: CulturalContext): "direct" | "indirect" | "narrative" | "peer" {
  if (ctx.culturalValues.powerDistance > 60) return "direct";
  if (ctx.assessmentPreferences.contextVsLinear === "high-context") return "narrative";
  if (ctx.assessmentPreferences.competitiveVsCollaborative === "collaborative") return "peer";
  return "direct";
}
