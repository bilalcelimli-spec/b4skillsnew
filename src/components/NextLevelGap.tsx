/**
 * NextLevelGap
 *
 * Shows 5 priority skill gaps between the candidate's current CEFR level
 * and the next level, derived from skill-level theta scores.
 */

import { motion } from "motion/react";
import { ArrowUpCircle, Zap } from "lucide-react";
import {
  thetaToCefr,
  nextCefrLevel,
  getCanDo,
  CEFR_META,
  CEFR_THETA_THRESHOLDS,
  type CefrLevel,
  type SkillDomain,
} from "../lib/cefr/cefr-framework";
import { cn } from "../lib/utils";

interface SkillScore {
  theta: number;
  sem: number;
}

interface Props {
  skillScores: Record<string, SkillScore>;
  overallTheta: number | null | undefined;
  className?: string;
}

const SKILL_DOMAIN_MAP: Record<string, SkillDomain | undefined> = {
  reading: "reading",
  listening: "listening",
  writing: "writing",
  speaking: "speaking",
};

const SKILL_LABELS: Record<string, string> = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  speaking: "Speaking",
  grammar: "Grammar",
  vocabulary: "Vocabulary",
};

interface GapItem {
  skill: string;
  currentLevel: CefrLevel;
  targetLevel: CefrLevel;
  gap: number;     // theta distance to next threshold
  canDo: string;
  priority: number;
}

function computeGaps(skillScores: Record<string, SkillScore>, overallTheta: number | null | undefined): GapItem[] {
  const safeTheta = overallTheta ?? 0;
  const overallLevel = thetaToCefr(safeTheta);
  const target = nextCefrLevel(overallLevel);
  if (!target) return [];

  const items: GapItem[] = [];

  const skills = Object.keys(skillScores).length > 0
    ? Object.keys(skillScores)
    : ["reading", "listening", "writing", "speaking"];

  for (const skill of skills) {
    const score = skillScores[skill];
    const theta = score?.theta ?? safeTheta;
    const currentLevel = thetaToCefr(theta);
    const skillTarget = nextCefrLevel(currentLevel) ?? target;

    // Distance from current theta to the lower boundary of next level
    const thresholdKey = skillTarget === "C2" ? "C1" : skillTarget;
    const nextThreshold = CEFR_THETA_THRESHOLDS[thresholdKey] ?? 4;
    const gap = Math.max(0, nextThreshold - theta);

    const domain = SKILL_DOMAIN_MAP[skill];
    const canDos = domain ? getCanDo(skillTarget, domain) : [];
    const canDo = canDos[0]?.descriptors[0] ?? `Reach ${skillTarget} in ${skill}`;

    items.push({
      skill,
      currentLevel,
      targetLevel: skillTarget,
      gap,
      canDo,
      priority: gap,
    });
  }

  // Sort by gap descending (biggest deficit first), return top 5
  return items.sort((a, b) => b.priority - a.priority).slice(0, 5);
}

export function NextLevelGap({ skillScores, overallTheta, className }: Props) {
  const overallLevel = thetaToCefr(overallTheta ?? 0);
  const target = nextCefrLevel(overallLevel);

  if (!target) {
    return (
      <div className={cn("rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center", className)}>
        <p className="text-emerald-700 font-bold text-sm">You have reached C2 — the highest CEFR level.</p>
      </div>
    );
  }

  const gaps = computeGaps(skillScores, overallTheta);
  const targetMeta = CEFR_META[target];

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-3">
        <ArrowUpCircle size={18} className="text-indigo-500 flex-shrink-0" />
        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
            Path to {target}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">{targetMeta?.summary}</p>
        </div>
      </div>

      <div className="space-y-3">
        {gaps.map((item, i) => (
          <GapRow key={item.skill} item={item} index={i} />
        ))}
      </div>
    </div>
  );
}

function GapRow({ item, index }: { item: GapItem; index: number }) {
  const label = SKILL_LABELS[item.skill] ?? item.skill;
  const isUrgent = index === 0;

  // Visual progress: treat 0 gap as 100%, max gap ~3 theta units
  const progressPct = Math.round(Math.max(0, Math.min(100, (1 - item.gap / 3) * 100)));

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.2 }}
      className={cn(
        "rounded-xl border p-4 bg-white",
        isUrgent ? "border-indigo-200 bg-indigo-50/40" : "border-slate-200"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isUrgent && <Zap size={12} className="text-indigo-500" />}
          <span className="text-xs font-black text-slate-800 uppercase tracking-wide">{label}</span>
          <span className="text-[10px] font-bold text-slate-400">
            {item.currentLevel} → {item.targetLevel}
          </span>
        </div>
        <span className="text-[10px] font-black text-slate-500">{progressPct}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2">
        <motion.div
          className={cn("h-full rounded-full", isUrgent ? "bg-indigo-500" : "bg-slate-400")}
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ delay: index * 0.06 + 0.15, duration: 0.5, ease: "easeOut" }}
        />
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{item.canDo}</p>
    </motion.div>
  );
}
