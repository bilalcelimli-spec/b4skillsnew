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
  uncertain: boolean;
  priority: number;
}

function computeGaps(skillScores: Record<string, SkillScore>): GapItem[] {
  const items: GapItem[] = [];
  for (const [skill, score] of Object.entries(skillScores)) {
    if (!Number.isFinite(score.theta) || !Number.isFinite(score.sem) || score.sem < 0) continue;
    const currentLevel = thetaToCefr(score.theta);
    const skillTarget = nextCefrLevel(currentLevel);
    if (!skillTarget) continue;
    // CEFR_THETA_THRESHOLDS contains upper boundaries; the target needs its lower boundary.
    const nextThreshold = CEFR_META[skillTarget].theta.min;
    const gap = Math.max(0, nextThreshold - score.theta);
    const domain = SKILL_DOMAIN_MAP[skill];
    const canDos = domain ? getCanDo(skillTarget, domain) : [];
    items.push({skill,currentLevel,targetLevel:skillTarget,gap,priority:gap,
      uncertain:score.theta + 1.96 * score.sem >= nextThreshold,
      canDo:canDos[0]?.descriptors[0] ?? `Develop ${skill} toward ${skillTarget}`});
  }
  return items.sort((a,b)=>b.priority-a.priority).slice(0,5);
}

export function NextLevelGap({ skillScores, className }: Props) {
  const measured = Object.values(skillScores).filter(score => Number.isFinite(score.theta) && Number.isFinite(score.sem) && score.sem >= 0);
  if (!measured.length) return <p className={cn('text-sm text-slate-500',className)}>No measured skill estimates are available for development targets.</p>;
  const gaps = computeGaps(skillScores);
  if (!gaps.length) return <p className={cn('text-sm text-slate-500',className)}>Reported skills are at C2. Maintain and extend these skills.</p>;
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center gap-3">
        <ArrowUpCircle size={18} className="text-indigo-500 flex-shrink-0" />
        <div>
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Suggested skill targets</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Learning goals based on measured skills and provisional platform boundaries. Distances are not predicted gains or completion percentages.</p>
        </div>
      </div>
      <div className="space-y-3">{gaps.map((item,i)=><GapRow key={item.skill} item={item} index={i}/>)}</div>
    </div>
  );
}

function GapRow({ item, index }: { item: GapItem; index: number }) {
  const label = SKILL_LABELS[item.skill] ?? item.skill;
  const isUrgent = index === 0;


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
        <span className="text-[10px] font-mono text-slate-500">{item.gap.toFixed(2)} θ to next band</span>
      </div>

      {item.uncertain && <p className="text-[11px] text-amber-700 mb-2">The model-based 95% interval overlaps the target boundary. Confirm with additional evidence.</p>}

      <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{item.canDo}</p>
    </motion.div>
  );
}
