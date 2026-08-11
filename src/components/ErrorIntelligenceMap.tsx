/**
 * ErrorIntelligenceMap
 *
 * Visualises grammar structure performance and vocabulary profile
 * derived from response-level data returned by the adaptive-report API.
 */

import { motion } from "motion/react";
import { XCircle, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "../lib/utils";

interface ResponseEntry {
  itemId: string;
  skill: string;
  cefrLevel: string;
  isCorrect: boolean;
  score?: number;
  latencyMs?: number;
}

interface Props {
  responses: ResponseEntry[];
  className?: string;
}

interface SkillStat {
  skill: string;
  correct: number;
  total: number;
  avgLatencyMs: number;
}

interface CefrBreakdown {
  level: string;
  correct: number;
  total: number;
}

function buildStats(responses: ResponseEntry[]) {
  const skillMap: Record<string, { correct: number; total: number; latencySum: number }> = {};
  const cefrMap: Record<string, { correct: number; total: number }> = {};

  for (const r of responses) {
    const s = r.skill?.toLowerCase() ?? "unknown";
    if (!skillMap[s]) skillMap[s] = { correct: 0, total: 0, latencySum: 0 };
    skillMap[s].total++;
    if (r.isCorrect) skillMap[s].correct++;
    skillMap[s].latencySum += r.latencyMs ?? 0;

    const lvl = r.cefrLevel ?? "B1";
    if (!cefrMap[lvl]) cefrMap[lvl] = { correct: 0, total: 0 };
    cefrMap[lvl].total++;
    if (r.isCorrect) cefrMap[lvl].correct++;
  }

  const skills: SkillStat[] = Object.entries(skillMap).map(([skill, d]) => ({
    skill,
    correct: d.correct,
    total: d.total,
    avgLatencyMs: d.total > 0 ? Math.round(d.latencySum / d.total) : 0,
  })).sort((a, b) => a.correct / a.total - b.correct / b.total);

  const LEVEL_ORDER = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
  const cefr: CefrBreakdown[] = Object.entries(cefrMap)
    .sort(([a], [b]) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b))
    .map(([level, d]) => ({ level, ...d }));

  return { skills, cefr };
}

const SKILL_COLORS: Record<string, string> = {
  grammar: "bg-violet-500",
  vocabulary: "bg-amber-500",
  reading: "bg-indigo-500",
  listening: "bg-teal-500",
  writing: "bg-emerald-500",
  speaking: "bg-rose-500",
};

function AccuracyIcon({ pct }: { pct: number }) {
  if (pct >= 75) return <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />;
  if (pct >= 50) return <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />;
  return <XCircle size={14} className="text-red-400 flex-shrink-0" />;
}

export function ErrorIntelligenceMap({ responses, className }: Props) {
  if (!responses || responses.length === 0) {
    return (
      <div className={cn("rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center", className)}>
        <p className="text-slate-500 text-sm">No response data available.</p>
      </div>
    );
  }

  const { skills, cefr } = buildStats(responses);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Skill accuracy */}
      <section>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
          Skill Accuracy
        </h3>
        <div className="space-y-2">
          {skills.map((s, i) => {
            const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
            const color = SKILL_COLORS[s.skill] ?? "bg-slate-400";
            const label = s.skill.charAt(0).toUpperCase() + s.skill.slice(1);
            return (
              <motion.div
                key={s.skill}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.2 }}
                className="flex items-center gap-3"
              >
                <AccuracyIcon pct={pct} />
                <span className="w-24 text-xs font-bold text-slate-700 capitalize">{label}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    className={cn("h-full rounded-full", color)}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: i * 0.05 + 0.1, duration: 0.45, ease: "easeOut" }}
                  />
                </div>
                <span className="w-10 text-right text-xs font-black text-slate-600">{pct}%</span>
                <span className="text-[10px] text-slate-400 w-20 text-right">
                  {s.correct}/{s.total} correct
                </span>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* CEFR level breakdown */}
      {cefr.length > 0 && (
        <section>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
            Performance by Difficulty Level
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {cefr.map((c, i) => {
              const pct = c.total > 0 ? Math.round((c.correct / c.total) * 100) : 0;
              return (
                <motion.div
                  key={c.level}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                  className="rounded-xl border border-slate-200 bg-white p-3 text-center"
                >
                  <div className="text-lg font-black text-slate-900">{c.level.replace("_", "")}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{c.correct}/{c.total}</div>
                  <div className={cn(
                    "text-sm font-black mt-1",
                    pct >= 75 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-500"
                  )}>{pct}%</div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
