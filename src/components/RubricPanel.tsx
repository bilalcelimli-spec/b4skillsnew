/**
 * RubricPanel — shows the 7 AI scoring dimensions for Writing / Speaking.
 *
 * Used in two contexts:
 *   • PreTestBriefing: mode="preview" — what will be scored (no scores shown)
 *   • ScoreReportV2:   mode="scores"  — actual per-dimension values shown
 */
import React, { useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import { cn } from "../lib/utils.js";

// ── Dimension definitions ─────────────────────────────────────────────────────

export interface RubricDimension {
  id: string;
  label: string;
  abbrev: string;
  applies: ("writing" | "speaking")[];
  description: string;
  anchorLow: string;   // score 1–3
  anchorMid: string;   // score 5–6
  anchorHigh: string;  // score 8–10
}

export const RUBRIC_DIMENSIONS: RubricDimension[] = [
  {
    id: "task_achievement",
    label: "Task Achievement",
    abbrev: "TA",
    applies: ["writing", "speaking"],
    description: "Does the response address the prompt, fulfil the communicative purpose, and meet length or format requirements?",
    anchorLow:  "Minimal attempt; prompt largely unaddressed.",
    anchorMid:  "Main points covered with some irrelevance or omission.",
    anchorHigh: "Fully addresses all parts; purpose clearly fulfilled.",
  },
  {
    id: "grammatical_range",
    label: "Grammatical Range",
    abbrev: "GR",
    applies: ["writing", "speaking"],
    description: "Variety of grammatical structures used — complex sentences, subordination, verb forms, conditionals.",
    anchorLow:  "Only simple or repetitive structures.",
    anchorMid:  "Mix of simple and complex; some variety.",
    anchorHigh: "Wide range of complex structures used flexibly.",
  },
  {
    id: "grammatical_accuracy",
    label: "Grammatical Accuracy",
    abbrev: "GA",
    applies: ["writing", "speaking"],
    description: "Accuracy of grammatical forms. Errors classified as minor (inflection, article) or major (clause structure, tense).",
    anchorLow:  "Frequent major errors impede meaning.",
    anchorMid:  "Some errors present; mostly minor.",
    anchorHigh: "Near error-free; occasional minor slips only.",
  },
  {
    id: "lexical_resource",
    label: "Lexical Resource",
    abbrev: "LR",
    applies: ["writing", "speaking"],
    description: "Breadth of vocabulary, collocations, idiomatic usage, and avoidance of undue repetition.",
    anchorLow:  "Very limited range; heavy repetition.",
    anchorMid:  "Adequate range; some collocations attempted.",
    anchorHigh: "Rich, varied vocabulary; idiomatic and precise.",
  },
  {
    id: "lexical_accuracy",
    label: "Lexical Accuracy",
    abbrev: "LA",
    applies: ["writing", "speaking"],
    description: "Words used with correct meaning and register. Spelling errors (writing) and word-form errors noted here.",
    anchorLow:  "Frequent word-choice errors; wrong register.",
    anchorMid:  "Mostly accurate; occasional word-form errors.",
    anchorHigh: "Accurate throughout; appropriate register.",
  },
  {
    id: "coherence_cohesion",
    label: "Coherence & Cohesion",
    abbrev: "CC",
    applies: ["writing", "speaking"],
    description: "Logical organisation, use of discourse markers, referencing, and paragraph / turn structure.",
    anchorLow:  "Little organisation; few or misused connectors.",
    anchorMid:  "Generally clear with some cohesive devices.",
    anchorHigh: "Skilfully organised; wide range of devices.",
  },
  {
    id: "fluency_pronunciation",
    label: "Fluency & Pronunciation",
    abbrev: "FP",
    applies: ["speaking"],
    description: "Delivery speed (target 120–150 wpm for B1+), minimal disfluency, clear pronunciation, and pitch variation.",
    anchorLow:  "Very hesitant; frequent long pauses; unclear.",
    anchorMid:  "Generally fluent with occasional hesitation.",
    anchorHigh: "Smooth, natural delivery; clear and expressive.",
  },
];

// ── Utility ───────────────────────────────────────────────────────────────────

function scoreColor(v: number): string {
  if (v >= 8) return "bg-emerald-500";
  if (v >= 6) return "bg-blue-500";
  if (v >= 4) return "bg-amber-400";
  return "bg-red-400";
}

function scoreBand(v: number): string {
  if (v >= 8) return "High";
  if (v >= 6) return "Good";
  if (v >= 4) return "Fair";
  return "Low";
}

// ── Preview mode (PreTestBriefing) ────────────────────────────────────────────

export const RubricPreview: React.FC<{ skill: "writing" | "speaking" }> = ({ skill }) => {
  const dims = RUBRIC_DIMENSIONS.filter(d => d.applies.includes(skill));
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-slate-50 px-4 py-2.5 flex items-center gap-2 border-b border-slate-200">
        <Info size={14} className="text-indigo-500" />
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
          How your {skill === "writing" ? "Writing" : "Speaking"} is scored — {dims.length} dimensions
        </p>
      </div>
      <div className="divide-y divide-slate-100">
        {dims.map((d) => (
          <div key={d.id}>
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors"
              onClick={() => setExpanded(expanded === d.id ? null : d.id)}
              aria-expanded={expanded === d.id}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-black text-slate-400 w-6 shrink-0">{d.abbrev}</span>
                <span className="text-sm font-semibold text-slate-800">{d.label}</span>
              </div>
              <ChevronDown
                size={14}
                className={cn("text-slate-400 transition-transform shrink-0", expanded === d.id && "rotate-180")}
              />
            </button>
            {expanded === d.id && (
              <div className="px-4 pb-3 space-y-2">
                <p className="text-xs text-slate-600 leading-relaxed">{d.description}</p>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { label: "1–3", text: d.anchorLow,  color: "bg-red-50 border-red-100 text-red-700" },
                    { label: "5–6", text: d.anchorMid,  color: "bg-amber-50 border-amber-100 text-amber-700" },
                    { label: "8–10",text: d.anchorHigh, color: "bg-emerald-50 border-emerald-100 text-emerald-700" },
                  ].map(({ label, text, color }) => (
                    <div key={label} className={cn("border rounded-lg p-2", color)}>
                      <p className="text-[10px] font-black mb-1">{label}</p>
                      <p className="text-[10px] leading-snug">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Scores mode (ScoreReportV2) ───────────────────────────────────────────────

export interface RubricScores {
  task_achievement?:      number;
  grammatical_range?:     number;
  grammatical_accuracy?:  number;
  lexical_resource?:      number;
  lexical_accuracy?:      number;
  coherence_cohesion?:    number;
  fluency_pronunciation?: number;  // speaking only
}

export const RubricScoreBreakdown: React.FC<{
  skill: "writing" | "speaking";
  scores: RubricScores;
  cefrBand: string;
}> = ({ skill, scores, cefrBand }) => {
  const dims = RUBRIC_DIMENSIONS.filter(d => d.applies.includes(skill));
  const scored = dims.filter(d => scores[d.id as keyof RubricScores] !== undefined);
  if (scored.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl border border-slate-200 overflow-hidden">
      <div className="bg-gradient-to-r from-slate-50 to-white px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
          AI Rubric Breakdown · {skill === "writing" ? "Writing" : "Speaking"} · {cefrBand}
        </p>
        <span className="text-[10px] text-slate-400 font-medium">Scale 1–10</span>
      </div>
      <div className="divide-y divide-slate-100">
        {scored.map((d) => {
          const v = scores[d.id as keyof RubricScores] as number;
          const pct = (v / 10) * 100;
          return (
            <div key={d.id} className="px-4 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 w-5">{d.abbrev}</span>
                  <span className="text-xs font-semibold text-slate-700">{d.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-900">{v}/10</span>
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded text-white", scoreColor(v))}>
                    {scoreBand(v)}
                  </span>
                </div>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", scoreColor(v))}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
        <p className="text-[10px] text-slate-400">
          Scored by multi-model AI ensemble (Gemini · Claude · GPT-4). Responses with low ensemble consensus are reviewed by a certified human examiner.
        </p>
      </div>
    </div>
  );
};
