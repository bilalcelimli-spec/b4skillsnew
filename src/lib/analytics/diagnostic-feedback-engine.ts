/**
 * Diagnostic Feedback Engine
 *
 * Generates personalised, skill-specific feedback for candidates based on:
 *  - Theta (ability) estimate and CEFR level
 *  - Writing: ArgumentQualityProfile (discourse features, Toulmin framework)
 *  - Speaking: ProsodicProfile (acoustic–prosodic features)
 *  - Item-level error patterns (wrong answers by skill/sub-skill tag)
 *
 * Feedback is structured at two levels:
 *  1. Summary level  — A short paragraph per skill (for candidates)
 *  2. Diagnostic level — Fine-grained feature scores with benchmark comparison (for teachers)
 *
 * References
 * ──────────
 * Hattie, J. & Timperley, H. (2007). The power of feedback. Review of Educational Research, 77(1), 81–112.
 * Nicol, D.J. & Macfarlane-Dick, D. (2006). Formative assessment and self-regulated learning.
 *   Studies in Higher Education, 31(2), 199–218.
 */

// ─── CEFR benchmark profiles ────────────────────────────────────────────────

/** Expected writing discourse feature values by CEFR level */
export const WRITING_BENCHMARKS: Record<string, {
  argumentDepthScore: number;
  discourseQualityScore: number;
  evidenceDensity: number;
  claimDensity: number;
  registerConsistency: string;
}> = {
  A1: { argumentDepthScore: 1, discourseQualityScore: 1.5, evidenceDensity: 0.0, claimDensity: 0.0, registerConsistency: "INFORMAL" },
  A2: { argumentDepthScore: 2, discourseQualityScore: 2.5, evidenceDensity: 0.01, claimDensity: 0.01, registerConsistency: "INFORMAL" },
  B1: { argumentDepthScore: 3.5, discourseQualityScore: 4.0, evidenceDensity: 0.02, claimDensity: 0.02, registerConsistency: "MIXED" },
  B2: { argumentDepthScore: 5.5, discourseQualityScore: 5.5, evidenceDensity: 0.04, claimDensity: 0.03, registerConsistency: "FORMAL" },
  C1: { argumentDepthScore: 7.0, discourseQualityScore: 7.0, evidenceDensity: 0.06, claimDensity: 0.05, registerConsistency: "FORMAL" },
  C2: { argumentDepthScore: 9.0, discourseQualityScore: 8.5, evidenceDensity: 0.08, claimDensity: 0.07, registerConsistency: "FORMAL" },
};

/** Expected speaking prosodic feature values by CEFR level */
export const SPEAKING_BENCHMARKS: Record<string, {
  speechRateWpm: number;
  pauseRate: number;
  cttr: number;
  dci: number;
}> = {
  A1: { speechRateWpm: 65, pauseRate: 0.30, cttr: 0.35, dci: 0.2 },
  A2: { speechRateWpm: 85, pauseRate: 0.22, cttr: 0.42, dci: 0.3 },
  B1: { speechRateWpm: 110, pauseRate: 0.16, cttr: 0.50, dci: 0.4 },
  B2: { speechRateWpm: 135, pauseRate: 0.11, cttr: 0.58, dci: 0.55 },
  C1: { speechRateWpm: 155, pauseRate: 0.07, cttr: 0.65, dci: 0.70 },
  C2: { speechRateWpm: 165, pauseRate: 0.05, cttr: 0.72, dci: 0.82 },
};

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FeedbackItem {
  area: string;
  level: "strength" | "developing" | "priority";
  message: string;
  /** Specific, actionable study advice */
  suggestion?: string;
}

export interface SkillFeedback {
  skill: string;
  cefrLevel: string;
  aiScore: number;
  summaryParagraph: string;
  items: FeedbackItem[];
}

export interface DiagnosticFeedbackReport {
  candidateId: string;
  sessionId: string;
  theta: number;
  overallCefrLevel: string;
  generatedAt: string;
  skills: SkillFeedback[];
  teacherNote: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function cefrFromTheta(theta: number): string {
  if (theta < -3.0) return "PRE_A1";
  if (theta < -1.578) return "A1";
  if (theta < -0.733) return "A2";
  if (theta < 0.168) return "B1";
  if (theta < 0.995) return "B2";
  if (theta < 2.0) return "C1";
  return "C2";
}

function normalize(cefr: string): string {
  return cefr.replace("PRE_A1", "A1");
}

function rateVsTarget(actual: number, target: number, tolerance = 0.15): "strength" | "developing" | "priority" {
  const ratio = actual / Math.max(target, 0.001);
  if (ratio >= (1 - tolerance)) return "strength";
  if (ratio >= 0.60) return "developing";
  return "priority";
}

// ─── Writing feedback generator ─────────────────────────────────────────────

function generateWritingFeedback(
  cefrLevel: string,
  aiScore: number,
  argumentQualityProfile?: Record<string, any>
): SkillFeedback {
  const items: FeedbackItem[] = [];
  const benchmark = WRITING_BENCHMARKS[normalize(cefrLevel)] ?? WRITING_BENCHMARKS["B1"];

  if (argumentQualityProfile) {
    const flags: string[] = argumentQualityProfile.flags ?? [];
    const {
      argumentDepthScore = 0,
      discourseQualityScore = 0,
      argumentFeatures,
      coherenceFeatures,
      registerFeatures,
    } = argumentQualityProfile;

    // Argument depth
    const argLevel = rateVsTarget(argumentDepthScore, benchmark.argumentDepthScore);
    items.push({
      area: "Argument Depth",
      level: argLevel,
      message: argLevel === "strength"
        ? "Your writing demonstrates well-developed argumentation with clear claims and supporting evidence."
        : argLevel === "developing"
        ? "You include some claims and supporting ideas, but developing these further will strengthen your writing."
        : "Your response would benefit from stating a clear position and backing it with evidence.",
      suggestion: argLevel !== "strength"
        ? "Practice the PEEL structure: Point, Evidence, Explanation, Link. Start each paragraph with one clear claim."
        : undefined,
    });

    // Evidence use
    const evDensity = argumentFeatures?.evidenceDensity ?? 0;
    const evLevel = rateVsTarget(evDensity, benchmark.evidenceDensity + 0.01);
    if (evLevel !== "strength") {
      items.push({
        area: "Evidence & Examples",
        level: evLevel,
        message: "Using concrete examples and data will make your arguments more persuasive.",
        suggestion: "Try phrases like 'For example, ...', 'Research shows that ...', or 'In my experience, ...' to introduce evidence.",
      });
    }

    // Coherence / cohesion
    const cohRef = coherenceFeatures?.cohesiveReferenceDensity ?? 0;
    const cohLevel = cohRef >= 0.03 ? "strength" : cohRef >= 0.01 ? "developing" : "priority";
    items.push({
      area: "Cohesion & Flow",
      level: cohLevel,
      message: cohLevel === "strength"
        ? "Your writing flows well with effective use of linking words and references."
        : "Using more cohesive devices will improve the flow between your sentences and paragraphs.",
      suggestion: cohLevel !== "strength"
        ? "Use connectors like 'Furthermore', 'However', 'As a result', 'In contrast' to connect ideas."
        : undefined,
    });

    // Register consistency
    const regConsistency = registerFeatures?.registerConsistency ?? "MIXED";
    if (regConsistency === "INFORMAL" && (cefrLevel === "B2" || cefrLevel === "C1" || cefrLevel === "C2")) {
      items.push({
        area: "Register & Formality",
        level: "priority",
        message: "Your writing contains informal language that is not appropriate for academic writing tasks.",
        suggestion: "Avoid contractions (don't → do not), slang, and conversational phrases. Use formal vocabulary (e.g., 'utilise' instead of 'use').",
      });
    }

    // Concession / counter-argument
    if (!flags.includes("NO_CLAIM_DETECTED") && benchmark.argumentDepthScore >= 4) {
      const hasCounter = argumentQualityProfile?.argumentFeatures?.hasCounterArgument ?? false;
      if (!hasCounter) {
        items.push({
          area: "Counter-argument",
          level: "developing",
          message: "Acknowledging opposing viewpoints and refuting them shows critical thinking.",
          suggestion: "Add a sentence like 'While some argue that ..., this view overlooks ...' to demonstrate awareness of different perspectives.",
        });
      } else {
        items.push({
          area: "Counter-argument",
          level: "strength",
          message: "Good work acknowledging and addressing the opposing viewpoint.",
        });
      }
    }
  } else {
    items.push({
      area: "Writing Analysis",
      level: "developing",
      message: "Detailed discourse analysis is not available for this response.",
    });
  }

  // Summary paragraph
  const strengthCount = items.filter((i) => i.level === "strength").length;
  const priorityCount = items.filter((i) => i.level === "priority").length;
  let summaryParagraph: string;
  if (strengthCount >= items.length / 2) {
    summaryParagraph = `Your writing demonstrates strong capabilities at the ${cefrLevel} level (score: ${aiScore.toFixed(2)}). Focus on the developing areas below to push towards the next CEFR level.`;
  } else if (priorityCount > 0) {
    summaryParagraph = `Your writing is developing at the ${cefrLevel} level (score: ${aiScore.toFixed(2)}). There are key areas that need targeted practice, particularly ${items.filter((i) => i.level === "priority").map((i) => i.area).join(" and ")}.`;
  } else {
    summaryParagraph = `Your writing shows good progress at the ${cefrLevel} level (score: ${aiScore.toFixed(2)}). Continue practising to consolidate these skills.`;
  }

  return { skill: "WRITING", cefrLevel, aiScore, summaryParagraph, items };
}

// ─── Speaking feedback generator ─────────────────────────────────────────────

function generateSpeakingFeedback(
  cefrLevel: string,
  aiScore: number,
  prosodicProfile?: Record<string, any>
): SkillFeedback {
  const items: FeedbackItem[] = [];
  const benchmark = SPEAKING_BENCHMARKS[normalize(cefrLevel)] ?? SPEAKING_BENCHMARKS["B1"];

  if (prosodicProfile) {
    const {
      speechRateWpm = 0,
      pauseRate = 1,
      cttr = 0,
      dci = 0,
      repairDensity = 0,
      cefrPrediction,
    } = prosodicProfile;

    // Fluency (speech rate + pause rate)
    const rateLevel = rateVsTarget(speechRateWpm, benchmark.speechRateWpm, 0.25);
    items.push({
      area: "Fluency & Speech Rate",
      level: rateLevel,
      message: rateLevel === "strength"
        ? `Your speech rate (${Math.round(speechRateWpm)} wpm) is appropriate for ${cefrLevel} level.`
        : speechRateWpm < benchmark.speechRateWpm * 0.7
        ? `Your speaking pace (${Math.round(speechRateWpm)} wpm) is slower than typical for ${cefrLevel}. Aim for approximately ${Math.round(benchmark.speechRateWpm)} words per minute.`
        : `Your speech rate is developing. Practise speaking at a steady pace to improve fluency.`,
      suggestion: rateLevel !== "strength"
        ? "Use shadowing practice: listen to native speakers and repeat immediately after them, matching their rhythm."
        : undefined,
    });

    // Pause control
    if (pauseRate > benchmark.pauseRate * 1.5) {
      items.push({
        area: "Pause Management",
        level: pauseRate > benchmark.pauseRate * 2.5 ? "priority" : "developing",
        message: "Frequent pauses interrupt your speech flow. Focus on planning what to say before you start speaking.",
        suggestion: "Practise 'thinking aloud' — use filler phrases like 'That's an interesting question...' to buy thinking time.",
      });
    } else {
      items.push({
        area: "Pause Management",
        level: "strength",
        message: "You manage pauses effectively, maintaining a natural speech rhythm.",
      });
    }

    // Vocabulary range (CTTR)
    const vocabLevel = rateVsTarget(cttr, benchmark.cttr, 0.20);
    items.push({
      area: "Vocabulary Range",
      level: vocabLevel,
      message: vocabLevel === "strength"
        ? "You demonstrate a good range of vocabulary appropriate for your level."
        : "Expanding your active vocabulary will help you express ideas more precisely.",
      suggestion: vocabLevel !== "strength"
        ? "Learn 5 new topic-specific words each day and practise using them in sentences. Focus on collocations rather than isolated words."
        : undefined,
    });

    // Discourse coherence (DCI)
    const dciLevel = rateVsTarget(dci, benchmark.dci, 0.25);
    if (dciLevel !== "strength" && benchmark.dci >= 0.35) {
      items.push({
        area: "Discourse Coherence",
        level: dciLevel,
        message: "Using more discourse markers will help organise your spoken ideas more clearly.",
        suggestion: "Practise signposting: 'First of all...', 'Moving on to...', 'What I mean is...', 'To sum up...'",
      });
    }

    // Self-repair density
    if (repairDensity > 0.05) {
      items.push({
        area: "Self-Corrections",
        level: "developing",
        message: "You correct yourself frequently, which can interrupt fluency. This usually reduces as confidence builds.",
        suggestion: "Practise common topics for 2 minutes without stopping — train yourself to keep going even when unsure.",
      });
    }
  } else {
    items.push({
      area: "Speaking Analysis",
      level: "developing",
      message: "Detailed prosodic analysis is not available for this response.",
    });
  }

  const strengthCount = items.filter((i) => i.level === "strength").length;
  const priorityCount = items.filter((i) => i.level === "priority").length;
  let summaryParagraph: string;
  if (strengthCount >= items.length / 2) {
    summaryParagraph = `Your speaking performance is strong at the ${cefrLevel} level (score: ${aiScore.toFixed(2)}). Keep practising to reach the next CEFR milestone.`;
  } else if (priorityCount > 0) {
    summaryParagraph = `Your speaking is at the ${cefrLevel} level (score: ${aiScore.toFixed(2)}). Prioritise the areas marked below with targeted practice activities.`;
  } else {
    summaryParagraph = `Your speaking shows good progress at the ${cefrLevel} level (score: ${aiScore.toFixed(2)}). Continue building confidence in the developing areas.`;
  }

  return { skill: "SPEAKING", cefrLevel, aiScore, summaryParagraph, items };
}

// ─── Generic skill feedback (READING / LISTENING / GRAMMAR / VOCABULARY) ────

function generateGenericFeedback(
  skill: string,
  cefrLevel: string,
  aiScore: number,
  errorTagCounts: Record<string, number>
): SkillFeedback {
  const items: FeedbackItem[] = [];
  const sorted = Object.entries(errorTagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  for (const [tag, count] of sorted) {
    items.push({
      area: tag.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
      level: count >= 3 ? "priority" : "developing",
      message: `You had ${count} error${count > 1 ? "s" : ""} in items tagged "${tag}". Focus on practising this area.`,
      suggestion: undefined,
    });
  }

  if (items.length === 0) {
    items.push({
      area: skill,
      level: "strength",
      message: `Strong performance in ${skill.toLowerCase()} at ${cefrLevel} level.`,
    });
  }

  const summaryParagraph = items.some((i) => i.level === "priority")
    ? `Your ${skill.toLowerCase()} performance at ${cefrLevel} (score: ${aiScore.toFixed(2)}) shows some gaps that need targeted practice.`
    : `Your ${skill.toLowerCase()} performance at ${cefrLevel} (score: ${aiScore.toFixed(2)}) is on track.`;

  return { skill, cefrLevel, aiScore, summaryParagraph, items };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface SessionResponseSummary {
  skill: string;
  aiScore?: number | null;
  humanScore?: number | null;
  metadata?: Record<string, any> | null;
  isCorrect?: boolean | null;
  item: {
    skill: string;
    cefrLevel: string;
    tags?: string[] | null;
  };
}

export interface SessionSummaryInput {
  candidateId: string;
  sessionId: string;
  theta: number;
  cefrLevel: string;
  responses: SessionResponseSummary[];
}

/**
 * Generate a full diagnostic feedback report for a completed session.
 */
export function generateSessionFeedback(input: SessionSummaryInput): DiagnosticFeedbackReport {
  const { candidateId, sessionId, theta, cefrLevel, responses } = input;

  // Group responses by skill
  const bySkill = new Map<string, SessionResponseSummary[]>();
  for (const r of responses) {
    const key = r.item.skill;
    if (!bySkill.has(key)) bySkill.set(key, []);
    bySkill.get(key)!.push(r);
  }

  const skills: SkillFeedback[] = [];

  for (const [skill, skillResponses] of bySkill) {
    const aiScore = skillResponses
      .map((r) => r.aiScore ?? r.humanScore ?? null)
      .filter((s): s is number => s !== null)
      .reduce((sum, s, _, arr) => sum + s / arr.length, 0);

    if (skill === "WRITING") {
      // Find the response with a argumentQualityProfile
      const metaWithProfile = skillResponses.find(
        (r) => r.metadata && (r.metadata as any).argumentQualityProfile
      );
      const argumentQualityProfile = metaWithProfile?.metadata
        ? (metaWithProfile.metadata as any).argumentQualityProfile
        : undefined;
      skills.push(generateWritingFeedback(cefrLevel, aiScore, argumentQualityProfile));
    } else if (skill === "SPEAKING") {
      const metaWithProfile = skillResponses.find(
        (r) => r.metadata && (r.metadata as any).prosodicProfile
      );
      const prosodicProfile = metaWithProfile?.metadata
        ? (metaWithProfile.metadata as any).prosodicProfile
        : undefined;
      skills.push(generateSpeakingFeedback(cefrLevel, aiScore, prosodicProfile));
    } else {
      // For other skills, aggregate error tags from wrong answers
      const errorTagCounts: Record<string, number> = {};
      for (const r of skillResponses) {
        if (!r.isCorrect && r.item.tags) {
          for (const tag of r.item.tags) {
            errorTagCounts[tag] = (errorTagCounts[tag] ?? 0) + 1;
          }
        }
      }
      skills.push(generateGenericFeedback(skill, cefrLevel, aiScore, errorTagCounts));
    }
  }

  // Teacher note based on theta
  let teacherNote: string;
  if (theta < -2.5) {
    teacherNote = `Candidate is functioning at a basic level (θ = ${theta.toFixed(2)}). Recommend intensive support with foundational grammar and vocabulary before re-assessment.`;
  } else if (theta < 0) {
    teacherNote = `Candidate is developing (θ = ${theta.toFixed(2)}). Targeted practice in the flagged areas should yield measurable improvement within 6–8 weeks.`;
  } else if (theta < 2.0) {
    teacherNote = `Candidate is at an intermediate-to-advanced level (θ = ${theta.toFixed(2)}). Focus on academic register, complex argumentation, and nuanced listening comprehension.`;
  } else {
    teacherNote = `Candidate is at an advanced level (θ = ${theta.toFixed(2)}). Recommend exposure to authentic academic and professional materials to refine proficiency.`;
  }

  return {
    candidateId,
    sessionId,
    theta,
    overallCefrLevel: cefrLevel,
    generatedAt: new Date().toISOString(),
    skills,
    teacherNote,
  };
}
