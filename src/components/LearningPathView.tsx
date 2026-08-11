/**
 * LearningPathView
 *
 * Fetches the personalised learning path for a session and renders
 * a 7-day / 30-day / 90-day milestone roadmap.
 */

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Target, Calendar, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

interface Milestone {
  id: string;
  title: string;
  description: string;
  targetCefrLevel: string;
  targetSkill: string;
  estimatedDays: number;
  completionCriteria: { minScore: number; minSessions: number };
}

interface LearningPath {
  sessionId: string;
  currentCefrLevel: string;
  targetCefrLevel: string;
  estimatedWeeksToTarget: number;
  prioritySkills: string[];
  weeklyGoal: { sessions: number; minutesPerDay: number };
  milestones: Milestone[];
}

interface Props {
  sessionId: string;
  className?: string;
}

const HORIZON_LABELS = ["7-Day Focus", "30-Day Goal", "90-Day Milestone"];
const HORIZON_DAYS = [7, 30, 90];

function pickHorizon(milestones: Milestone[], maxDays: number): Milestone[] {
  return milestones.filter((m) => m.estimatedDays <= maxDays).slice(0, 3);
}

export function LearningPathView({ sessionId, className }: Props) {
  const [path, setPath] = useState<LearningPath | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/learning-path`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setPath(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center py-8", className)}>
        <Loader2 size={20} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  if (error || !path) {
    return (
      <div className={cn("rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center", className)}>
        <p className="text-slate-500 text-sm">Learning path unavailable.</p>
      </div>
    );
  }

  const horizons = HORIZON_DAYS.map((days, i) => ({
    label: HORIZON_LABELS[i],
    days,
    milestones: pickHorizon(path.milestones, days),
  })).filter((h) => h.milestones.length > 0);

  return (
    <div className={cn("space-y-5", className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Target size={18} className="text-indigo-500 flex-shrink-0" />
        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Your Learning Roadmap
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {path.currentCefrLevel} → {path.targetCefrLevel} · est. {path.estimatedWeeksToTarget} weeks
          </p>
        </div>
      </div>

      {/* Weekly goal chip */}
      <div className="flex items-center gap-2 text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2 font-bold w-fit">
        <Calendar size={13} />
        {path.weeklyGoal.sessions}× sessions / week · {path.weeklyGoal.minutesPerDay} min/day
      </div>

      {/* Priority skills */}
      {path.prioritySkills?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 self-center mr-1">Focus:</span>
          {path.prioritySkills.map((s) => (
            <span key={s} className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-lg capitalize">
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-4">
        {horizons.map((h, hi) => (
          <div key={h.label}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{h.label}</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
            <div className="space-y-2">
              {h.milestones.map((m, mi) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (hi * 3 + mi) * 0.06, duration: 0.2 }}
                  className="rounded-xl border border-slate-200 bg-white p-4 flex items-start gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[10px] font-black text-indigo-600">{hi * 3 + mi + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-slate-900">{m.title}</span>
                      <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap capitalize">{m.targetSkill}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{m.description}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-slate-400">
                        Score ≥ {Math.round(m.completionCriteria.minScore * 100)}% · {m.completionCriteria.minSessions} sessions
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-slate-300 flex-shrink-0 mt-1" />
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
