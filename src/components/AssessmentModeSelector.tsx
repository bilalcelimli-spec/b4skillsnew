import { OZGUN_PRODUCT, OZGUN_TITLE } from "../lib/fixed-forms/ozgun-kids";
/**
 * AssessmentModeSelector
 *
 * Displays the b4skills assessment modes as selectable cards.
 * Each card shows time, skills covered, purpose, and maps to a
 * product-line name consumed by server-engine.ts.
 */

import { motion } from "motion/react";
import { Clock, Zap, BarChart2, BookOpen, ShieldCheck, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";
import { assessmentPresentation } from "../lib/product-lines/assessment-presentation";
import { PRODUCT_LINE_PROFILES, resolveProfileName } from "../lib/product-lines/profiles";

export interface AssessmentMode {
  id: string;
  label: string;
  tagline: string;
  time: string;
  skills: string[];
  purpose: string;
  icon: React.ReactNode;
  accent: string;        // Tailwind bg class for the icon block
  productLine: string;   // value passed to startNewTest()
  recommended?: boolean;
}

const MODE_CARDS: Omit<AssessmentMode, "time" | "skills">[] = [
  {id:'ozgun-kids-form-a',label:OZGUN_TITLE,tagline:'96 soruluk sabit sınav',purpose:'Kitapçıktaki soru sırası, bölüm süreleri ve dinleme kayıtlarıyla uygulanır.',icon:<BookOpen size={22}/>,accent:'bg-pink-600',productLine:OZGUN_PRODUCT},
  {
    id: "quick-check",
    label: "Rapid Diagnostic",
    tagline: "Fast six-skill profile",
    purpose: "Get an adaptive CEFR profile across all six skills with short productive tasks.",
    icon: <Zap size={22} />,
    accent: "bg-amber-500",
    productLine: "15-Min Diagnostic",
  },
  {
    id: "standard-placement",
    label: "Standard Placement",
    tagline: "Course placement",
    purpose: "Course placement across six sections, including writing and speaking.",
    icon: <BarChart2 size={22} />,
    accent: "bg-indigo-500",
    productLine: "Express Assessment (30-Min)",
    recommended: true,
  },
  {
    id: "complete-4-skill",
    label: "Complete 4-Skill",
    tagline: "Full proficiency assessment",
    purpose: "Flagship b4skills assessment. Includes AI-scored speaking and writing for a full CEFR profile.",
    icon: <BookOpen size={22} />,
    accent: "bg-emerald-500",
    productLine: "General English",
  },
  {
    id: "academic",
    label: "Academic English",
    tagline: "University & IELTS pathway",
    purpose: "Designed for university admissions and academic placement. Higher weighting on extended writing and inference.",
    icon: <ShieldCheck size={22} />,
    accent: "bg-violet-500",
    productLine: "Academia",
  },

];

const MODES: AssessmentMode[] = MODE_CARDS.map(mode => {
  const facts = assessmentPresentation(mode.productLine);
  return {...mode, time: `${facts.duration} min`, skills: facts.skills};
});

interface Props {
  onSelect: (productLine: string) => void;
  allowedProductLine?: string;
  className?: string;
}

export function AssessmentModeSelector({ onSelect, allowedProductLine, className }: Props) {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const assignedProduct = resolveProfileName(allowedProductLine) ?? allowedProductLine;
  const matched = assignedProduct
    ? MODES.filter((m) => norm(m.productLine) === norm(assignedProduct))
    : [];
  const assignedProfile = Object.values(PRODUCT_LINE_PROFILES).find(profile => assignedProduct && norm(profile.name) === norm(assignedProduct));
  const filtered: AssessmentMode[] = matched.length ? matched : assignedProfile ? [{
    id: assignedProfile.name, label: assignedProfile.displayName ?? assignedProfile.name,
    tagline: "Assigned assessment", time: `${assessmentPresentation(assignedProfile.name).duration} min`,
    skills: assessmentPresentation(assignedProfile.name).skills, purpose: "Start the assessment assigned to your exam code.",
    icon: <BookOpen size={22}/>, accent: "bg-indigo-500", productLine: assignedProfile.name,
  }] : [];
  const visible = filtered.length > 0 ? filtered : MODES.filter(mode=>mode.productLine!==OZGUN_PRODUCT);
  if (assignedProduct && filtered.length === 0) return <p role="alert">The assigned assessment is unavailable. Please contact your institution.</p>;

  return (
    <div className={cn("space-y-3", className)}>
      <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
        Choose Assessment Mode
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
        {visible.map((mode, i) => (
          <ModeCard key={mode.id} mode={mode} delay={i * 0.05} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function ModeCard({ mode, delay, onSelect }: { mode: AssessmentMode; delay: number; onSelect: (pl: string) => void }) {
  return (
    <motion.button
      data-testid="test-card"
      data-assessment-mode={mode.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.22 }}
      onClick={() => onSelect(mode.productLine)}
      className={cn(
        "group relative w-full text-left rounded-2xl border border-slate-200 bg-white p-5",
        "hover:border-indigo-300 hover:shadow-md hover:shadow-indigo-100/60",
        "transition-all duration-200 focus-visible:outline-2 focus-visible:outline-indigo-500",
        mode.recommended && "ring-1 ring-indigo-300"
      )}
    >
      {mode.recommended && (
        <span className="absolute -top-2.5 left-4 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full">
          Most Popular
        </span>
      )}

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={cn("flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white", mode.accent)}>
          {mode.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-black text-slate-900 text-sm tracking-tight group-hover:text-indigo-700 transition-colors">
              {mode.label}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium whitespace-nowrap">
              <Clock size={11} /> {mode.time}
            </span>
          </div>

          <p className="text-xs text-slate-500 mt-1 leading-relaxed line-clamp-2">
            {mode.purpose}
          </p>

          {/* Skill chips */}
          <div className="flex flex-wrap gap-1 mt-2">
            {mode.skills.map((s) => (
              <span
                key={s}
                className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors"
              >
                {s}
              </span>
            ))}
          </div>
        </div>

        <ChevronRight size={16} className="flex-shrink-0 text-slate-300 group-hover:text-indigo-400 transition-colors mt-1" />
      </div>
    </motion.button>
  );
}
