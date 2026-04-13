/**
 * ItemGeneratorPanel — AI-Powered Item Authoring Studio
 *
 * Full UI for content teams to generate, review, and bank assessment items
 * using the three-persona SOTA pipeline (Writer → Reviewer → Reviser → QA Gate).
 *
 * Features:
 *  — Specification form: skill, CEFR level, format, topic, subSkill, genre, quantity
 *  — Live generation feed with progressive reveal
 *  — Quality Report card with APPROVED / REVIEW / REJECTED colour coding
 *  — Reviewer feedback panel (issues by severity)
 *  — Readability metrics panel
 *  — Revision history timeline
 *  — One-click "Add to Bank" → POST /api/items
 *  — Bulk generate (up to 5 items per run)
 */

import React, { useState, useRef } from "react";
import {
  Wand2, ChevronDown, CheckCircle2, AlertCircle, XCircle,
  BookOpen, Mic, PenTool, Headphones, MessageSquare, Eye,
  Sparkles, BarChart2, ChevronRight, Plus, RefreshCw, Send,
  Clock, Layers, ShieldCheck, Info, ArrowDown,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS matching server-side enums
// ─────────────────────────────────────────────────────────────────────────────

const SKILLS = [
  { value: "READING",   label: "Reading",   icon: BookOpen },
  { value: "LISTENING", label: "Listening", icon: Headphones },
  { value: "WRITING",   label: "Writing",   icon: PenTool },
  { value: "SPEAKING",  label: "Speaking",  icon: Mic },
  { value: "GRAMMAR",   label: "Grammar",   icon: Layers },
  { value: "VOCABULARY",label: "Vocabulary",icon: MessageSquare },
] as const;

const CEFR_LEVELS = ["A1","A2","B1","B2","C1","C2"] as const;

const FORMATS = [
  "MULTIPLE_CHOICE","TRUE_FALSE","FILL_BLANK","MATCHING",
  "SHORT_ANSWER","ESSAY","LISTENING_MC","CLOZE",
  "ERROR_CORRECTION","SENTENCE_COMPLETION","WORD_FORMATION",
  "OPEN_CLOZE","SUMMARY_COMPLETION","INFORMATION_TRANSFER",
] as const;

const GENRES = [
  "NARRATIVE","DESCRIPTIVE","EXPOSITORY","ARGUMENTATIVE",
  "PROCEDURAL","TRANSACTIONAL","INFORMATIONAL","INTERVIEW",
  "DIALOGUE","NEWS","ACADEMIC",
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface QualityIssue {
  code: string;
  severity: "critical" | "major" | "minor";
  category: string;
  message: string;
  field?: string;
  suggestion?: string;
}

interface QualityReport {
  qualityScore: number;
  status: "APPROVED" | "REVIEW" | "REJECTED";
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  issues: QualityIssue[];
  summary: string;
}

interface ReviewIssue {
  category: string;
  severity: "critical" | "major" | "minor";
  description: string;
  suggestion: string;
}

interface ItemReview {
  overallVerdict: "PASS" | "REVISE" | "REJECT";
  issues: ReviewIssue[];
  cefrAlignmentScore: number;
  constructClarity: number;
  languageAppropriacy: number;
  distractorQualityScore: number;
  summaryFeedback: string;
}

interface RevisionRecord {
  attempt: number;
  qualityScore: number;
  status: string;
  issueCount: number;
}

interface GeneratedItem {
  type: string;
  skill: string;
  cefrLevel: string;
  stimulus?: string;
  question?: string;
  options?: string[];
  correctAnswer?: string;
  acceptableAnswers?: string[];
  distractorRationale?: Record<string, string>;
  irtParams: { a: number; b: number; c: number };
  writingNotes?: string;
  qualityReport: QualityReport;
  itemReview?: ItemReview;
  readabilityScore: number;
  revisionHistory: RevisionRecord[];
  totalGenerationPasses: number;
  // After saving to bank
  _savedId?: string;
}

interface GenerationResult {
  items: GeneratedItem[];
  generationModel: string;
  approvedCount: number;
  reviewCount: number;
  rejectedCount: number;
}

interface ItemSpec {
  skill: string;
  level: string;
  format: string;
  genre?: string;
  topic?: string;
  targetSubSkill?: string;
  quantity: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: "APPROVED" | "REVIEW" | "REJECTED" | "PASS" | "REVISE" | "REJECT" }> = ({ status }) => {
  const configs = {
    APPROVED: { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200", icon: CheckCircle2, label: "Approved" },
    PASS:     { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-200", icon: CheckCircle2, label: "Pass" },
    REVIEW:   { bg: "bg-amber-100",   text: "text-amber-800",   border: "border-amber-200",   icon: AlertCircle, label: "Needs Review" },
    REVISE:   { bg: "bg-amber-100",   text: "text-amber-800",   border: "border-amber-200",   icon: AlertCircle, label: "Revise" },
    REJECTED: { bg: "bg-red-100",     text: "text-red-800",     border: "border-red-200",     icon: XCircle,     label: "Rejected" },
    REJECT:   { bg: "bg-red-100",     text: "text-red-800",     border: "border-red-200",     icon: XCircle,     label: "Rejected" },
  };
  const c = configs[status] ?? configs.REVIEW;
  return (
    <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border", c.bg, c.text, c.border)}>
      <c.icon size={11} />
      {c.label}
    </span>
  );
};

const SeverityDot: React.FC<{ severity: "critical" | "major" | "minor" }> = ({ severity }) => {
  const c = { critical: "bg-red-500", major: "bg-amber-500", minor: "bg-blue-400" }[severity];
  return <span className={cn("inline-block w-2 h-2 rounded-full shrink-0 mt-1", c)} />;
};

const ScoreDial: React.FC<{ score: number; label: string }> = ({ score, label }) => {
  const colour = score >= 75 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-600";
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={cn("text-2xl font-black tabular-nums", colour)}>{score}</span>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
    </div>
  );
};

const StarRating: React.FC<{ score: number; label: string }> = ({ score, label }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <div key={n} className={cn("w-3 h-3 rounded-sm", n <= score ? "bg-indigo-500" : "bg-slate-200")} />
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ITEM CARD
// ─────────────────────────────────────────────────────────────────────────────

const ItemCard: React.FC<{
  item: GeneratedItem;
  index: number;
  onSave: (item: GeneratedItem, index: number) => void;
  saving: boolean;
}> = ({ item, index, onSave, saving }) => {
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<"content"|"quality"|"review"|"readability"|"history">("content");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm"
    >
      {/* ── Card Header ── */}
      <div
        className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black flex items-center justify-center">{index + 1}</span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-800">{item.type}</span>
              <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium">{item.cefrLevel}</span>
              <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium">{item.skill}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.question ?? item.stimulus?.slice(0, 80) ?? "(no question text)"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={item.qualityReport.status} />
          <span className={cn("text-xs font-black tabular-nums", item.qualityReport.qualityScore >= 75 ? "text-emerald-600" : item.qualityReport.qualityScore >= 50 ? "text-amber-600" : "text-red-600")}>
            {item.qualityReport.qualityScore}/100
          </span>
          <ChevronDown size={16} className={cn("text-slate-400 transition-transform", expanded && "rotate-180")} />
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-100">
              {/* ── Tab Bar ── */}
              <div className="flex border-b border-slate-100 px-5">
                {(["content","quality","review","readability","history"] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-3 py-2.5 text-xs font-bold uppercase tracking-widest transition-colors border-b-2 -mb-px",
                      activeTab === tab ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="p-5">
                {/* ── Content Tab ── */}
                {activeTab === "content" && (
                  <div className="space-y-4">
                    {item.stimulus && (
                      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Stimulus</p>
                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{item.stimulus}</p>
                      </div>
                    )}
                    {item.question && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Question Stem</p>
                        <p className="text-sm font-medium text-slate-800">{item.question}</p>
                      </div>
                    )}
                    {item.options && item.options.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Options</p>
                        <div className="space-y-1.5">
                          {item.options.map((opt, i) => (
                            <div key={i} className={cn(
                              "flex items-start gap-2.5 p-2.5 rounded-lg text-sm border",
                              opt === item.correctAnswer
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-semibold"
                                : "bg-white border-slate-200 text-slate-700"
                            )}>
                              <span className="w-5 h-5 rounded-full bg-white border border-current flex items-center justify-center text-[10px] font-black shrink-0">
                                {String.fromCharCode(65 + i)}
                              </span>
                              <span>{opt}</span>
                              {opt === item.correctAnswer && <CheckCircle2 size={14} className="ml-auto shrink-0 text-emerald-600" />}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {item.acceptableAnswers && item.acceptableAnswers.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Acceptable Answers</p>
                        <div className="flex flex-wrap gap-1.5">
                          {item.acceptableAnswers.map((a, i) => (
                            <span key={i} className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2 py-1 rounded font-medium">{a}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {item.distractorRationale && (
                      <details className="mt-2">
                        <summary className="text-[10px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:text-slate-600">Distractor Rationale</summary>
                        <div className="mt-2 space-y-1.5 pl-3 border-l-2 border-slate-200">
                          {Object.entries(item.distractorRationale).map(([opt, rat]) => (
                            <div key={opt} className="text-xs">
                              <span className="font-semibold text-slate-700">{opt}:</span>{" "}
                              <span className="text-slate-600">{rat}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                    <div className="flex items-center gap-4 pt-2 border-t border-slate-100 text-xs text-slate-500">
                      <span>a={item.irtParams.a.toFixed(2)}</span>
                      <span>b={item.irtParams.b.toFixed(2)}</span>
                      <span>c={item.irtParams.c.toFixed(2)}</span>
                      <span>Passes: {item.totalGenerationPasses}</span>
                    </div>
                  </div>
                )}

                {/* ── Quality Tab ── */}
                {activeTab === "quality" && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <ScoreDial score={item.qualityReport.qualityScore} label="Quality" />
                      <div className="flex flex-col gap-1.5">
                        <StatusBadge status={item.qualityReport.status} />
                        <p className="text-xs text-slate-500">{item.qualityReport.summary}</p>
                      </div>
                      <div className="ml-auto flex gap-3 text-xs text-center">
                        <div><div className="font-black text-red-600 text-lg">{item.qualityReport.criticalCount}</div><div className="text-slate-500">Critical</div></div>
                        <div><div className="font-black text-amber-600 text-lg">{item.qualityReport.majorCount}</div><div className="text-slate-500">Major</div></div>
                        <div><div className="font-black text-blue-600 text-lg">{item.qualityReport.minorCount}</div><div className="text-slate-500">Minor</div></div>
                      </div>
                    </div>
                    {item.qualityReport.issues.length === 0 ? (
                      <p className="text-sm text-emerald-600 flex items-center gap-1.5 font-medium"><CheckCircle2 size={14}/> No issues detected</p>
                    ) : (
                      <div className="space-y-2">
                        {item.qualityReport.issues.map((iss, i) => (
                          <div key={i} className="flex items-start gap-2.5 p-3 bg-white rounded-lg border border-slate-200">
                            <SeverityDot severity={iss.severity} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{iss.code}</span>
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">{iss.category}</span>
                              </div>
                              <p className="text-xs text-slate-700 mt-0.5">{iss.message}</p>
                              {iss.suggestion && <p className="text-xs text-indigo-600 mt-1 italic">→ {iss.suggestion}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Review Tab ── */}
                {activeTab === "review" && (
                  <div className="space-y-4">
                    {!item.itemReview ? (
                      <p className="text-sm text-slate-500 italic">No independent review data available.</p>
                    ) : (
                      <>
                        <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <StatusBadge status={item.itemReview.overallVerdict} />
                          <p className="text-sm text-slate-700 italic flex-1">"{item.itemReview.summaryFeedback}"</p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <StarRating score={item.itemReview.cefrAlignmentScore} label="CEFR Alignment" />
                          <StarRating score={item.itemReview.constructClarity} label="Construct Clarity" />
                          <StarRating score={item.itemReview.languageAppropriacy} label="Language Quality" />
                          <StarRating score={item.itemReview.distractorQualityScore} label="Distractors" />
                        </div>
                        {item.itemReview.issues.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reviewer Issues Found & Addressed</p>
                            {item.itemReview.issues.map((iss, i) => (
                              <div key={i} className="flex items-start gap-2.5 p-3 bg-white rounded-lg border border-amber-100">
                                <SeverityDot severity={iss.severity} />
                                <div className="flex-1">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{iss.category}</span>
                                  <p className="text-xs text-slate-700 mt-1">{iss.description}</p>
                                  <p className="text-xs text-indigo-600 italic mt-0.5">→ {iss.suggestion}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* ── Readability Tab ── */}
                {activeTab === "readability" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <ScoreDial score={item.readabilityScore ?? 0} label="Readability" />
                      <p className="text-xs text-slate-500 flex-1">
                        Stimulus linguistic quality score. Above 70 passes the CEFR gate.
                        Run a full analysis via the readability engine for detailed metrics.
                      </p>
                    </div>
                    {item.writingNotes && (
                      <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                        <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-1">Writer's Notes</p>
                        <p className="text-xs text-indigo-700">{item.writingNotes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── History Tab ── */}
                {activeTab === "history" && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Auto-Revision Timeline ({item.totalGenerationPasses} total passes)</p>
                    {item.revisionHistory.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No revision history recorded.</p>
                    ) : (
                      <div className="relative pl-5">
                        <div className="absolute left-2 top-1 bottom-1 w-0.5 bg-slate-200 rounded" />
                        {item.revisionHistory.map((rec, i) => (
                          <div key={i} className="relative mb-3 flex items-start gap-3">
                            <div className="absolute -left-3 top-0.5 w-2 h-2 rounded-full bg-indigo-500" />
                            <div className="bg-white border border-slate-200 rounded-lg p-3 flex-1 flex items-center justify-between gap-4">
                              <div>
                                <p className="text-xs font-bold text-slate-700">Attempt {rec.attempt}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">{rec.issueCount} issue(s) at this stage</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={cn("text-sm font-black tabular-nums", rec.qualityScore >= 75 ? "text-emerald-600" : rec.qualityScore >= 50 ? "text-amber-600" : "text-red-600")}>{rec.qualityScore}/100</span>
                                <StatusBadge status={rec.status as "APPROVED" | "REVIEW" | "REJECTED"} />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Actions ── */}
              <div className="px-5 pb-4 flex justify-end gap-2 border-t border-slate-100 pt-3">
                {item._savedId ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg">
                    <CheckCircle2 size={13} /> Saved to Bank
                  </span>
                ) : (
                  <button
                    onClick={() => onSave(item, index)}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition-colors"
                  >
                    {saving ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
                    Add to Bank
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PANEL
// ─────────────────────────────────────────────────────────────────────────────

export const ItemGeneratorPanel: React.FC = () => {
  const [spec, setSpec] = useState<ItemSpec>({
    skill: "READING",
    level: "B1",
    format: "MULTIPLE_CHOICE",
    genre: "",
    topic: "",
    targetSubSkill: "",
    quantity: 1,
  });
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setResult(null);

    const payload: Record<string, unknown> = {
      skill: spec.skill,
      level: spec.level,
      format: spec.format,
      quantity: spec.quantity,
    };
    if (spec.genre) payload.genre = spec.genre;
    if (spec.topic) payload.topic = spec.topic;
    if (spec.targetSubSkill) payload.targetSubSkill = spec.targetSubSkill;

    try {
      const res = await fetch("/api/items/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`Server error ${res.status}: ${msg}`);
      }
      const data: GenerationResult = await res.json();
      setResult(data);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (err) {
      setError(String(err));
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveItem = async (item: GeneratedItem, index: number) => {
    setSavingIndex(index);
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: item.type,
          skill: item.skill,
          cefrLevel: item.cefrLevel,
          content: item,
          discrimination: item.irtParams.a,
          difficulty: item.irtParams.b,
          guessing: item.irtParams.c,
          status: item.qualityReport.status === "APPROVED" ? "ACTIVE" : "DRAFT",
        }),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      const saved = await res.json();
      setResult(prev => {
        if (!prev) return prev;
        const items = [...prev.items];
        items[index] = { ...items[index], _savedId: saved.id };
        return { ...prev, items };
      });
    } catch (err) {
      alert(`Failed to save item: ${String(err)}`);
    } finally {
      setSavingIndex(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Wand2 className="text-indigo-600" size={22} /> AI Item Generator
          </h2>
          <p className="text-sm text-slate-500 mt-1">Three-persona pipeline: Writer → Reviewer → Reviser → QA Gate</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-xl">
          <Sparkles size={13} className="text-indigo-500" />
          Gemini 2.5 Flash
        </div>
      </div>

      {/* ── Specification Form ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
          <ShieldCheck size={16} className="text-indigo-600" />
          <h3 className="font-bold text-sm text-slate-700 uppercase tracking-widest">Item Specification</h3>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Skill */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Macro Skill *</label>
            <div className="grid grid-cols-3 gap-1.5">
              {SKILLS.map(s => (
                <button
                  key={s.value}
                  onClick={() => setSpec(p => ({ ...p, skill: s.value }))}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-bold transition-all",
                    spec.skill === s.value
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                      : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
                  )}
                >
                  <s.icon size={14} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* CEFR Level */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">CEFR Level *</label>
            <div className="grid grid-cols-3 gap-1.5">
              {CEFR_LEVELS.map(l => (
                <button
                  key={l}
                  onClick={() => setSpec(p => ({ ...p, level: l }))}
                  className={cn(
                    "py-2 rounded-lg border text-xs font-black transition-all",
                    spec.level === l
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300"
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Format */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Item Format *</label>
            <select
              value={spec.format}
              onChange={e => setSpec(p => ({ ...p, format: e.target.value }))}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            >
              {FORMATS.map(f => <option key={f} value={f}>{f.replace(/_/g, " ")}</option>)}
            </select>
          </div>

          {/* Genre */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Text Genre</label>
            <select
              value={spec.genre}
              onChange={e => setSpec(p => ({ ...p, genre: e.target.value }))}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            >
              <option value="">Any genre</option>
              {GENRES.map(g => <option key={g} value={g}>{g.charAt(0) + g.slice(1).toLowerCase()}</option>)}
            </select>
          </div>

          {/* Topic */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Topic / Context</label>
            <input
              type="text"
              value={spec.topic}
              onChange={e => setSpec(p => ({ ...p, topic: e.target.value }))}
              placeholder="e.g. urban transport, climate"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Sub-skill */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Target Sub-Skill</label>
            <input
              type="text"
              value={spec.targetSubSkill}
              onChange={e => setSpec(p => ({ ...p, targetSubSkill: e.target.value }))}
              placeholder="e.g. inferring attitude"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Quantity (1–5)</label>
            <div className="flex gap-1.5">
              {[1,2,3,4,5].map(n => (
                <button
                  key={n}
                  onClick={() => setSpec(p => ({ ...p, quantity: n }))}
                  className={cn(
                    "flex-1 py-2 rounded-lg border text-xs font-black transition-all",
                    spec.quantity === n ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Pipeline info banner */}
        <div className="mx-6 mb-5 p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-start gap-2.5">
          <Info size={14} className="text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-xs text-indigo-700 leading-relaxed">
            Each item goes through <strong>3 Gemini passes</strong> (Writer → Independent Reviewer → Reviser) plus automated linguistic QA.
            Items below a quality score of 70 trigger up to <strong>3 auto-revision cycles</strong>.
            Expect ~15–30 seconds per item. {spec.quantity > 1 && <><strong>{spec.quantity} items</strong> will run sequentially.</>}
          </p>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            {generating ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Generating {spec.quantity} item{spec.quantity > 1 ? "s" : ""} via 3-persona pipeline…
              </>
            ) : (
              <>
                <Wand2 size={16} />
                Generate {spec.quantity} Item{spec.quantity > 1 ? "s" : ""}
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5">
          <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800">Generation Failed</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {result && (
        <div ref={resultsRef} className="space-y-4">
          {/* Summary bar */}
          <div className="flex items-center justify-between p-4 bg-slate-900 text-white rounded-xl">
            <div className="flex items-center gap-2">
              <BarChart2 size={15} className="text-indigo-400" />
              <span className="text-sm font-bold">{result.items.length} Item{result.items.length !== 1 ? "s" : ""} Generated</span>
              <span className="text-xs text-slate-400 ml-1">via {result.generationModel}</span>
            </div>
            <div className="flex gap-3 text-xs font-bold">
              <span className="text-emerald-400">{result.approvedCount} Approved</span>
              <span className="text-amber-400">{result.reviewCount} Review</span>
              <span className="text-red-400">{result.rejectedCount} Rejected</span>
            </div>
          </div>

          {result.items.map((item, i) => (
            <ItemCard
              key={i}
              item={item}
              index={i}
              onSave={handleSaveItem}
              saving={savingIndex === i}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ItemGeneratorPanel;
