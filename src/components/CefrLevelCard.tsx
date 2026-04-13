/**
 * CefrLevelCard — A rich, expert-level CEFR result card.
 *
 * Shows level badge, descriptors (Can-Do), rubric expectations, exam equivalences,
 * and career/academic context drawn from the canonical CEFR Framework module.
 */
import React, { useState } from "react";
import { cn } from "../lib/utils";
import {
  CEFR_META,
  getCanDo,
  getRubric,
  cefrToIelts,
  cefrToToefl,
  nextCefrLevel,
  CEFR_CONTEXTS,
  type CefrLevel,
  type SkillDomain,
} from "../lib/cefr/cefr-framework";

interface CefrLevelCardProps {
  level: CefrLevel;
  theta?: number;
  skillBreakdown?: Record<string, CefrLevel>;  // { reading: "B2", listening: "B1", ... }
  className?: string;
  compact?: boolean;
}

const DOMAIN_LABELS: Record<string, string> = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  speaking: "Speaking",
};

const DOMAIN_ICONS: Record<string, string> = {
  reading: "📖",
  listening: "🎧",
  writing: "✍️",
  speaking: "🎤",
};

export const CefrLevelCard: React.FC<CefrLevelCardProps> = ({
  level,
  theta,
  skillBreakdown,
  className,
  compact = false,
}) => {
  const [activeTab, setActiveTab] = useState<"overview" | "canDo" | "context" | "exams">("overview");
  const meta = CEFR_META[level];
  const next = nextCefrLevel(level);
  const context = CEFR_CONTEXTS.find((c) => c.level === level);
  const writingRubric = getRubric(level, "writing");
  const speakingRubric = getRubric(level, "speaking");

  if (!meta) return null;

  const tabs: { key: "overview" | "canDo" | "context" | "exams"; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "canDo", label: "Can-Do" },
    { key: "context", label: "Career / Academic" },
    { key: "exams", label: "Exam Equivalences" },
  ];

  return (
    <div className={cn("rounded-2xl border overflow-hidden shadow-sm bg-white", meta.border, className)}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className={cn("px-6 py-5 flex items-center justify-between", meta.bg)}>
        <div className="flex items-center gap-4">
          <div className={cn("text-5xl font-black leading-none", meta.color)}>{level}</div>
          <div>
            <div className={cn("text-sm font-black uppercase tracking-widest", meta.color)}>
              {meta.group} User
            </div>
            <div className="text-slate-700 font-semibold text-base">{meta.label}</div>
          </div>
        </div>
        <div className="text-right hidden sm:block">
          {theta !== undefined && (
            <div className="text-xs font-bold text-slate-500 mb-1">
              θ = {theta.toFixed(2)}
            </div>
          )}
          <div className={cn("text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full", meta.bg, meta.color, "border", meta.border)}>
            CEFR {meta.groupShort} Band
          </div>
        </div>
      </div>

      {/* ── Summary bar ────────────────────────────────────────────── */}
      <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 text-sm text-slate-600 font-medium">
        {meta.summary}
      </div>

      {/* ── Skill breakdown pills ──────────────────────────────────── */}
      {skillBreakdown && Object.keys(skillBreakdown).length > 0 && (
        <div className="px-6 py-4 flex flex-wrap gap-2 border-b border-slate-100">
          {Object.entries(skillBreakdown).map(([skill, skillLevel]) => {
            const sm = CEFR_META[skillLevel];
            return (
              <div key={skill} className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold", sm?.bg, sm?.color, sm?.border)}>
                <span>{DOMAIN_ICONS[skill] || "📊"}</span>
                <span>{DOMAIN_LABELS[skill] || skill}</span>
                <span className="font-black">{skillLevel}</span>
              </div>
            );
          })}
        </div>
      )}

      {!compact && (
        <>
          {/* ── Tabs ─────────────────────────────────────────────────── */}
          <div className="flex border-b border-slate-100 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  "px-5 py-3 text-xs font-black uppercase tracking-widest whitespace-nowrap transition-colors",
                  activeTab === t.key
                    ? cn(meta.color, "border-b-2", meta.border.replace("border-", "border-b-"))
                    : "text-slate-400 hover:text-slate-600"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Tab Content ──────────────────────────────────────────── */}
          <div className="p-6">
            {activeTab === "overview" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {writingRubric && (
                    <div className="border border-slate-100 rounded-xl p-4">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Writing Expectation</div>
                      <div className="space-y-1 text-xs text-slate-600">
                        <div><span className="font-bold text-slate-700">Grammar:</span> {writingRubric.grammar}</div>
                        <div><span className="font-bold text-slate-700">Vocabulary:</span> {writingRubric.vocabulary}</div>
                        <div><span className="font-bold text-slate-700">Coherence:</span> {writingRubric.coherence}</div>
                      </div>
                    </div>
                  )}
                  {speakingRubric && (
                    <div className="border border-slate-100 rounded-xl p-4">
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Speaking Expectation</div>
                      <div className="space-y-1 text-xs text-slate-600">
                        <div><span className="font-bold text-slate-700">Fluency:</span> {speakingRubric.fluency}</div>
                        <div><span className="font-bold text-slate-700">Pronunciation:</span> {speakingRubric.pronunciation}</div>
                        <div><span className="font-bold text-slate-700">Vocabulary:</span> {speakingRubric.vocabulary}</div>
                      </div>
                    </div>
                  )}
                </div>
                {next && (
                  <div className={cn("rounded-xl p-4 border", CEFR_META[next]?.bg, CEFR_META[next]?.border)}>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Next Target Level</div>
                    <div className={cn("text-2xl font-black", CEFR_META[next]?.color)}>{next}</div>
                    <div className="text-xs text-slate-600 mt-1">{CEFR_META[next]?.summary}</div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "canDo" && (
              <div className="space-y-4">
                {(["reading", "listening", "writing", "speaking"] as SkillDomain[]).map((domain) => {
                  const canDos = getCanDo(level, domain);
                  if (!canDos.length) return null;
                  return (
                    <div key={domain}>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                        {DOMAIN_ICONS[domain]} {DOMAIN_LABELS[domain]}
                      </div>
                      <ul className="space-y-1">
                        {canDos.flatMap((d) =>
                          d.descriptors.map((desc, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                              <span className={cn("mt-0.5 text-xs font-black shrink-0", meta.color)}>✓</span>
                              {desc}
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "context" && context && (
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">🎓 Academic Pathways</div>
                  <ul className="space-y-1">
                    {context.academic.map((a, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className={cn("font-black shrink-0", meta.color)}>•</span>{a}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">💼 Professional Roles</div>
                  <ul className="space-y-1">
                    {context.professional.map((p, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className={cn("font-black shrink-0", meta.color)}>•</span>{p}
                      </li>
                    ))}
                  </ul>
                </div>
                {context.visaOrMigration && (
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">🌍 Immigration / Visa</div>
                    <ul className="space-y-1">
                      {context.visaOrMigration.map((v, i) => (
                        <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                          <span className={cn("font-black shrink-0", meta.color)}>•</span>{v}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === "exams" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border border-slate-100 rounded-xl p-4 text-center">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">IELTS</div>
                  <div className={cn("text-2xl font-black", meta.color)}>{cefrToIelts(level)}</div>
                  <div className="text-xs text-slate-400 mt-1">Band Score</div>
                </div>
                <div className="border border-slate-100 rounded-xl p-4 text-center">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">TOEFL iBT</div>
                  <div className={cn("text-2xl font-black", meta.color)}>{cefrToToefl(level)}</div>
                  <div className="text-xs text-slate-400 mt-1">Score Range</div>
                </div>
                <div className="border border-slate-100 rounded-xl p-4 text-center">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Cambridge</div>
                  <div className={cn("text-sm font-black", meta.color)}>{meta.camebridge || "—"}</div>
                </div>
                <div className="border border-slate-100 rounded-xl p-4 text-center sm:col-span-3">
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Pearson GSE Scale</div>
                  <div className={cn("text-2xl font-black", meta.color)}>{meta.gse.min}–{meta.gse.max}</div>
                  <div className="text-xs text-slate-400 mt-1">Global Scale of English</div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
