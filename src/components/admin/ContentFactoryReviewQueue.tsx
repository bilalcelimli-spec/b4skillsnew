/**
 * Content Factory Review Queue
 * §65 AI must not self-approve · §72 CEFR Review Form · §73 Moderation
 * §101 Reviewer Dashboard · §102-103 AI Reviewer / Red-team review
 * §150 Quality Gates 1-8
 *
 * Pipeline: AI_DRAFT → LANGUAGE_REVIEW → CEFR_REVIEW → FAIRNESS_REVIEW
 *           → MODERATION → APPROVED_FOR_PILOT
 * Each stage uses POST /api/items/:id/review with dimension scores + verdict.
 */
import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, XCircle,
  RotateCcw, Eye, Layers, BookOpen, Headphones, PenLine, Mic,
  BookMarked, Hash, Monitor, Tablet, Smartphone, RefreshCw,
  Info, ClipboardList, Clock, Shield, Edit3, Save, X,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReviewItem {
  id: string;
  itemCode: string | null;
  type: string;
  skill: string;
  cefrLevel: string;
  status: string;
  pipelineStage: string;
  iqScore: number | null;
  subskill: string | null;
  genre: string | null;
  topic: string | null;
  construct: string | null;
  evidenceStatement: string | null;
  content: Record<string, unknown>;
  tags: string[];
  difficulty: number;
  discrimination: number;
  ageSuitability: string | null;
  culturalLoad: string | null;
  englishVariant: string | null;
  provenance: string | null;
  createdAt: string;
  itemReviews: Array<{ id: string; reviewType: string; verdict: string; notes: string | null; revisionsReq: string[] | null; createdAt: string }>;
}

interface DimensionScores {
  constructClarity: number;
  cefrFit: number;
  cefrFitLabel: string;
  languageNaturalness: number;
  distractorQuality: number;
  fairnessScore: number;
  ambiguityRisk: number;
}

type Verdict = "APPROVE" | "MINOR_REVISION" | "MAJOR_REVISION" | "REJECT";
type DeviceSize = "desktop" | "tablet" | "mobile";

// ── Pipeline stage config ─────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  { stage: "EDITING",        label: "Needs Revision",  next: "LANGUAGE_REVIEW",    reviewType: "LANGUAGE_REVIEW",  role: "ITEM_WRITER" },
  { stage: "AI_DRAFT",       label: "AI Drafts",       next: "LANGUAGE_REVIEW",    reviewType: "LANGUAGE_REVIEW",  role: "Any reviewer" },
  { stage: "LANGUAGE_REVIEW",label: "Language Review", next: "CEFR_REVIEW",        reviewType: "LANGUAGE_REVIEW",  role: "LANGUAGE_REVIEWER" },
  { stage: "CEFR_REVIEW",    label: "CEFR Review",     next: "FAIRNESS_REVIEW",    reviewType: "CEFR_REVIEW",      role: "CEFR_REVIEWER" },
  { stage: "FAIRNESS_REVIEW",label: "Fairness Review", next: "MODERATION",         reviewType: "FAIRNESS_REVIEW",  role: "MODERATOR" },
  { stage: "MODERATION",     label: "Moderation",      next: "APPROVED_FOR_PILOT", reviewType: "MODERATION",       role: "MODERATOR / ASSESSMENT_DIRECTOR" },
  { stage: "FLAGGED",        label: "Flagged",          next: null,                 reviewType: "MODERATION",       role: "ASSESSMENT_DIRECTOR" },
];

const STAGE_CONFIG = Object.fromEntries(PIPELINE_STAGES.map((s) => [s.stage, s]));

const CEFR_FIT_LABELS = ["BELOW_TARGET", "TARGET_FIT", "ABOVE_TARGET", "UNCERTAIN"];

// ── Skill icons ───────────────────────────────────────────────────────────────

const SKILL_ICON: Record<string, React.ReactNode> = {
  READING: <BookOpen size={13} />, LISTENING: <Headphones size={13} />,
  WRITING: <PenLine size={13} />, SPEAKING: <Mic size={13} />,
  GRAMMAR: <BookMarked size={13} />, VOCABULARY: <Hash size={13} />,
};

// ── Item preview (§175 Preview exactly as candidate sees it) ─────────────────

function ItemPreview({ item, device }: { item: ReviewItem; device: DeviceSize }) {
  const c = item.content;
  const opts = Array.isArray(c.options) ? c.options as Array<{ id: string; text: string; isCorrect: boolean; rationale?: string; distractorRationale?: string }> : [];
  const isMCQ = ["MULTIPLE_CHOICE", "FILL_IN_BLANKS", "DRAG_DROP"].includes(item.type);
  const passage = (c.passage ?? c.readingText ?? c.text ?? "") as string;
  const ttsScript = (c.ttsScript ?? c.transcript ?? "") as string;
  const question = (c.question ?? c.stem ?? c.prompt ?? "") as string;

  const containerCls =
    device === "mobile" ? "max-w-sm mx-auto" :
    device === "tablet" ? "max-w-lg mx-auto" :
    "max-w-full";

  return (
    <div className={`${containerCls} space-y-3`}>
      {/* Passage — READING */}
      {item.skill === "READING" && passage && (
        <div className="rounded-lg border border-[var(--border)] bg-slate-50 dark:bg-slate-900/30 p-3 max-h-48 overflow-y-auto">
          <p className="text-[10px] font-semibold text-[var(--muted)] mb-1 uppercase tracking-wide">Passage</p>
          <p className="text-xs text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">{passage}</p>
        </div>
      )}

      {/* Script — LISTENING */}
      {item.skill === "LISTENING" && ttsScript && (
        <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/10 p-3">
          <p className="text-[10px] font-semibold text-purple-500 mb-1 uppercase tracking-wide flex items-center gap-1">
            <Headphones size={11} /> Audio Script (reviewer only)
          </p>
          <p className="text-xs text-[var(--foreground)] leading-relaxed whitespace-pre-wrap">{ttsScript}</p>
        </div>
      )}

      {/* Question stem */}
      {question && (
        <div className="rounded-lg border border-[var(--border)] p-3 bg-[var(--card)]">
          <p className="text-xs font-medium text-[var(--foreground)] leading-relaxed">{question}</p>
        </div>
      )}

      {/* MCQ options */}
      {isMCQ && opts.length > 0 && (
        <div className="space-y-1.5">
          {opts.map((o) => (
            <div
              key={o.id}
              className={`flex items-start gap-2 p-2.5 rounded-lg border text-xs ${
                o.isCorrect
                  ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20"
                  : "border-[var(--border)] bg-[var(--card)]"
              }`}
            >
              <span className={`font-bold shrink-0 w-5 ${o.isCorrect ? "text-emerald-600" : "text-[var(--muted)]"}`}>
                {o.id}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`${o.isCorrect ? "text-emerald-700 dark:text-emerald-400 font-medium" : "text-[var(--foreground)]"}`}>
                  {o.text}
                </p>
                {o.isCorrect && o.rationale && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-0.5 italic">{o.rationale}</p>
                )}
                {!o.isCorrect && o.distractorRationale && (
                  <p className="text-[10px] text-[var(--muted)] mt-0.5 italic">Distractor: {o.distractorRationale}</p>
                )}
              </div>
              {o.isCorrect && <CheckCircle2 size={12} className="text-emerald-500 shrink-0 mt-0.5" />}
            </div>
          ))}
        </div>
      )}

      {/* Writing/Speaking rubric */}
      {["WRITING", "SPEAKING"].includes(item.skill) && c.rubric && (
        <div className="rounded-lg border border-[var(--border)] p-3 bg-[var(--card)]">
          <p className="text-[10px] font-semibold text-[var(--muted)] mb-2 uppercase tracking-wide">Scoring Rubric</p>
          {Object.entries(c.rubric as Record<string, string>).map(([dim, desc]) => (
            <div key={dim} className="flex gap-2 text-xs mb-1.5 last:mb-0">
              <span className="font-medium text-[var(--foreground)] w-36 shrink-0 capitalize">{dim.replace(/([A-Z])/g, " $1").trim()}</span>
              <span className="text-[var(--muted)]">{desc}</span>
            </div>
          ))}
        </div>
      )}

      {/* Metadata strip */}
      <div className="flex flex-wrap gap-1.5 text-[10px]">
        {[
          { v: item.cefrLevel, cl: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400" },
          { v: item.skill, cl: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400" },
          item.subskill ? { v: item.subskill.replace(/_/g, " "), cl: "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400" } : null,
          item.genre ? { v: item.genre, cl: "bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400" } : null,
          item.topic ? { v: item.topic.replace(/_/g, " "), cl: "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400" } : null,
        ].filter(Boolean).map((tag, i) => (
          <span key={i} className={`px-1.5 py-0.5 rounded font-medium ${tag!.cl}`}>{tag!.v}</span>
        ))}
      </div>
    </div>
  );
}

// ── Dimension scorer ──────────────────────────────────────────────────────────

function DimensionSlider({ label, value, onChange, hint }: {
  label: string; value: number; onChange: (v: number) => void; hint?: string;
}) {
  const color = value >= 70 ? "accent-emerald-500" : value >= 40 ? "accent-amber-500" : "accent-red-500";
  return (
    <div>
      <div className="flex justify-between items-center mb-0.5">
        <label className="text-xs text-[var(--foreground)]">{label}</label>
        <span className={`text-xs font-bold tabular-nums ${value >= 70 ? "text-emerald-500" : value >= 40 ? "text-amber-500" : "text-red-500"}`}>
          {value}
        </span>
      </div>
      <input type="range" min={0} max={100} step={5} value={value}
        onChange={(e) => onChange(+e.target.value)}
        className={`w-full h-1.5 rounded-full ${color}`}
      />
      {hint && <p className="text-[10px] text-[var(--muted)] mt-0.5">{hint}</p>}
    </div>
  );
}

// ── Verdict button ────────────────────────────────────────────────────────────

function VerdictBtn({ verdict, active, onClick, disabled }: {
  verdict: Verdict; active: boolean; onClick: () => void; disabled?: boolean;
}) {
  const config: Record<Verdict, { label: string; icon: React.ReactNode; cls: string; activeCls: string }> = {
    APPROVE:         { label: "Approve",         icon: <CheckCircle2 size={13} />, cls: "border-emerald-300 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20", activeCls: "bg-emerald-500 text-white border-emerald-500" },
    MINOR_REVISION:  { label: "Minor Revision",  icon: <RotateCcw size={13} />,   cls: "border-amber-300 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20",     activeCls: "bg-amber-500 text-white border-amber-500" },
    MAJOR_REVISION:  { label: "Major Revision",  icon: <AlertTriangle size={13} />,cls: "border-orange-300 text-orange-600 dark:text-orange-400 hover:bg-orange-50",                             activeCls: "bg-orange-500 text-white border-orange-500" },
    REJECT:          { label: "Reject",           icon: <XCircle size={13} />,     cls: "border-red-300 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20",                activeCls: "bg-red-500 text-white border-red-500" },
  };
  const cfg = config[verdict];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-40 ${
        active ? cfg.activeCls : cfg.cls
      }`}
    >
      {cfg.icon}{cfg.label}
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ContentFactoryReviewQueue() {
  const [activeStage, setActiveStage] = useState("AI_DRAFT");
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [device, setDevice] = useState<DeviceSize>("desktop");

  // Review form state
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [notes, setNotes] = useState("");
  const [revisionsReq, setRevisionsReq] = useState("");
  const [dims, setDims] = useState<DimensionScores>({
    constructClarity: 70, cefrFit: 70, cefrFitLabel: "TARGET_FIT",
    languageNaturalness: 70, distractorQuality: 70, fairnessScore: 80, ambiguityRisk: 10,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitOk, setSubmitOk] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  // Inline content editor — only for AI_DRAFT / LANGUAGE_REVIEW
  const [editing, setEditing] = useState(false);
  const [editJson, setEditJson] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editErr, setEditErr] = useState<string | null>(null);

  const stageCfg = STAGE_CONFIG[activeStage];
  const item = items[currentIdx] ?? null;

  const fetchItems = useCallback(async (stage: string) => {
    setLoading(true);
    setCurrentIdx(0);
    setVerdict(null);
    setNotes("");
    setRevisionsReq("");
    setSubmitOk(false);
    setSubmitErr(null);
    try {
      const resp = await fetch(`/api/items?stage=${stage}&limit=50`);
      const data = await resp.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(activeStage); }, [activeStage, fetchItems]);

  const handleSubmit = async () => {
    if (!item || !verdict) return;
    setSubmitting(true);
    setSubmitOk(false);
    setSubmitErr(null);

    const stageTarget = verdict === "APPROVE" ? stageCfg?.next : null;
    try {
      const resp = await fetch(`/api/items/${item.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewType: stageCfg?.reviewType ?? "LANGUAGE_REVIEW",
          verdict,
          stageTarget,
          notes: notes || null,
          revisionsReq: revisionsReq ? revisionsReq.split("\n").map((s) => s.trim()).filter(Boolean) : [],
          constructClarity: dims.constructClarity,
          cefrFit: dims.cefrFit,
          cefrFitLabel: dims.cefrFitLabel,
          languageNaturalness: dims.languageNaturalness,
          distractorQuality: dims.distractorQuality,
          fairnessScore: dims.fairnessScore,
          ambiguityRisk: dims.ambiguityRisk,
        }),
      });
      if (!resp.ok) {
        const d = await resp.json();
        setSubmitErr(d.error ?? "Submit failed");
      } else {
        setSubmitOk(true);
        // Advance to next item after short delay
        setTimeout(() => {
          setSubmitOk(false);
          setVerdict(null);
          setNotes("");
          setRevisionsReq("");
          setDims({ constructClarity: 70, cefrFit: 70, cefrFitLabel: "TARGET_FIT", languageNaturalness: 70, distractorQuality: 70, fairnessScore: 80, ambiguityRisk: 10 });
          if (currentIdx + 1 < items.length) {
            setCurrentIdx((i) => i + 1);
          } else {
            fetchItems(activeStage);
          }
        }, 800);
      }
    } catch (e) {
      setSubmitErr((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stage tabs */}
      <div className="flex flex-wrap gap-1">
        {PIPELINE_STAGES.map((s) => (
          <button
            key={s.stage}
            onClick={() => setActiveStage(s.stage)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              activeStage === s.stage
                ? "border-blue-500 bg-blue-500 text-white"
                : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {s.label}
          </button>
        ))}
        <button
          onClick={() => fetchItems(activeStage)}
          className="ml-auto px-3 py-1.5 rounded-lg text-xs border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] flex items-center gap-1"
        >
          <RefreshCw size={11} /> Refresh
        </button>
      </div>

      {/* Role info */}
      {stageCfg && (
        <div className="flex items-center gap-2 text-xs text-[var(--muted)] px-1">
          <Shield size={11} className="text-blue-400 shrink-0" />
          <span>Required role: <strong className="text-[var(--foreground)]">{stageCfg.role}</strong>
            {stageCfg.next && <span className="ml-2">→ APPROVE advances to <strong className="text-[var(--foreground)]">{stageCfg.next}</strong></span>}
          </span>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-40 text-[var(--muted)] text-sm">
          <RefreshCw size={15} className="animate-spin mr-2" /> Loading items…
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center h-40 text-[var(--muted)] text-sm gap-2">
          <CheckCircle2 size={24} className="text-emerald-400" />
          No items in <strong>{stageCfg?.label ?? activeStage}</strong> stage.
        </div>
      )}

      {!loading && item && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Left — Item preview */}
          <div className="space-y-3">
            {/* Nav bar */}
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))} disabled={currentIdx === 0}
                className="p-1 rounded border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-30">
                <ChevronLeft size={13} />
              </button>
              <span className="text-xs text-[var(--muted)]">{currentIdx + 1} / {items.length}</span>
              <button onClick={() => setCurrentIdx((i) => Math.min(items.length - 1, i + 1))} disabled={currentIdx === items.length - 1}
                className="p-1 rounded border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-30">
                <ChevronRight size={13} />
              </button>

              <span className="ml-auto flex items-center gap-1 text-xs text-[var(--muted)]">{SKILL_ICON[item.skill]} {item.skill}</span>

              {/* Device switcher (§175) */}
              <div className="flex gap-1 ml-2">
                {(["desktop", "tablet", "mobile"] as DeviceSize[]).map((d) => (
                  <button key={d} onClick={() => setDevice(d)}
                    title={d}
                    className={`p-1 rounded border text-[10px] transition-colors ${device === d ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-500" : "border-[var(--border)] text-[var(--muted)]"}`}>
                    {d === "desktop" ? <Monitor size={12} /> : d === "tablet" ? <Tablet size={12} /> : <Smartphone size={12} />}
                  </button>
                ))}
              </div>
            </div>

            {/* Item ID / code / stage badges */}
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              <span className="font-mono text-[var(--muted)]">{item.itemCode ?? item.id.slice(0, 12)}</span>
              <span className={`px-1.5 py-0.5 rounded font-medium ${
                item.pipelineStage === "AI_DRAFT" ? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400" :
                item.pipelineStage === "FLAGGED" ? "bg-red-100 dark:bg-red-900/40 text-red-600" :
                "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
              }`}>{item.pipelineStage.replace(/_/g, " ")}</span>
              {item.iqScore != null && (
                <span className={`px-1.5 py-0.5 rounded font-medium ${item.iqScore >= 80 ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700" : "bg-amber-100 dark:bg-amber-900/40 text-amber-700"}`}>
                  IQS {Math.round(item.iqScore)}
                </span>
              )}
            </div>

            {/* Construct / evidence */}
            {(item.construct || item.evidenceStatement) && (
              <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/10 p-2.5 space-y-1">
                {item.construct && (
                  <p className="text-[10px] text-[var(--muted)]"><strong>Construct:</strong> {item.construct}</p>
                )}
                {item.evidenceStatement && (
                  <p className="text-[10px] text-[var(--muted)]"><strong>Evidence:</strong> {item.evidenceStatement}</p>
                )}
              </div>
            )}

            {/* Item preview */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 min-h-[200px]">
              <ItemPreview item={item} device={device} />
            </div>

            {/* Prior reviews */}
            {item.itemReviews.length > 0 && (
              <div className="rounded-lg border border-[var(--border)] p-2.5">
                <p className="text-[10px] font-semibold text-[var(--muted)] mb-1.5 uppercase tracking-wide flex items-center gap-1">
                  <ClipboardList size={10} /> Prior Reviews
                </p>
                {item.itemReviews.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 text-[10px] py-1 border-b border-[var(--border)] last:border-0">
                    <span className={`px-1.5 py-0.5 rounded font-medium ${
                      r.verdict === "APPROVE" ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700" :
                      r.verdict === "REJECT" ? "bg-red-100 dark:bg-red-900/40 text-red-700" :
                      "bg-amber-100 dark:bg-amber-900/40 text-amber-700"
                    }`}>{r.verdict}</span>
                    <span className="text-[var(--muted)]">{r.reviewType}</span>
                    {r.notes && <span className="text-[var(--muted)] truncate">{r.notes}</span>}
                    <span className="ml-auto text-[var(--muted)] shrink-0">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right — Review form */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-semibold text-[var(--foreground)] uppercase tracking-wide flex items-center gap-1.5">
                <Eye size={13} className="text-blue-500" /> Review Form — {stageCfg?.label ?? activeStage}
              </h4>
              {/* Inline editor toggle — only for early pipeline stages */}
              {["AI_DRAFT", "HUMAN_DRAFT", "EDITING", "LANGUAGE_REVIEW"].includes(item.pipelineStage) && (
                <button
                  onClick={() => {
                    setEditing((v) => {
                      if (!v) setEditJson(JSON.stringify(item.content, null, 2));
                      setEditErr(null);
                      return !v;
                    });
                  }}
                  className={`ml-auto flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${
                    editing
                      ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-600"
                      : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {editing ? <><X size={11} /> Cancel edit</> : <><Edit3 size={11} /> Edit content</>}
                </button>
              )}
            </div>

            {/* Content editor panel */}
            {editing && (
              <div className="rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10 p-3 space-y-2">
                <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1">
                  <Edit3 size={10} /> Edit item content (JSON)
                </p>
                <textarea
                  value={editJson}
                  onChange={(e) => setEditJson(e.target.value)}
                  rows={10}
                  className="w-full font-mono text-[10px] px-2 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-amber-400 resize-y"
                />
                {editErr && <p className="text-[10px] text-red-500">{editErr}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      setEditSaving(true);
                      setEditErr(null);
                      try {
                        const parsed = JSON.parse(editJson);
                        const r = await fetch(`/api/items/${item.id}/content`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ content: parsed, reason: "Manual edit during review" }),
                        });
                        const d = await r.json();
                        if (!r.ok) { setEditErr(d.error ?? "Save failed"); return; }
                        setEditing(false);
                        // Refresh item in list
                        const updated = await fetch(`/api/items?stage=${activeStage}&limit=50`).then((r) => r.json());
                        if (Array.isArray(updated)) setItems(updated);
                      } catch (e) {
                        setEditErr((e as Error).message);
                      } finally {
                        setEditSaving(false);
                      }
                    }}
                    disabled={editSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold disabled:opacity-50 transition-colors"
                  >
                    {editSaving ? <><RefreshCw size={11} className="animate-spin" /> Saving…</> : <><Save size={11} /> Save changes</>}
                  </button>
                  <button
                    onClick={() => { setEditing(false); setEditErr(null); }}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}


            {/* §72 CEFR Review dimensions */}
            <div className="rounded-xl border border-[var(--border)] p-3 bg-[var(--card)] space-y-3">
              <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wide">Dimension Scores (§72)</p>
              <DimensionSlider label="Construct Clarity" value={dims.constructClarity}
                onChange={(v) => setDims((d) => ({ ...d, constructClarity: v }))}
                hint="Is the measured construct clear and precise?" />
              <DimensionSlider label="Language Naturalness" value={dims.languageNaturalness}
                onChange={(v) => setDims((d) => ({ ...d, languageNaturalness: v }))}
                hint="Is the English idiomatic, natural, and appropriate to register?" />
              <DimensionSlider label="Distractor Quality" value={dims.distractorQuality}
                onChange={(v) => setDims((d) => ({ ...d, distractorQuality: v }))}
                hint="Are distractors plausible but unambiguously wrong? (MCQ only)" />
              <DimensionSlider label="Fairness Score" value={dims.fairnessScore}
                onChange={(v) => setDims((d) => ({ ...d, fairnessScore: v }))}
                hint="Free of cultural bias, accessibility issues, and sensitive content?" />
              <DimensionSlider label="Ambiguity Risk" value={dims.ambiguityRisk}
                onChange={(v) => setDims((d) => ({ ...d, ambiguityRisk: v }))}
                hint="0 = no ambiguity. 100 = multiple defensible answers." />

              {/* CEFR fit (§72) */}
              <div>
                <label className="block text-xs text-[var(--foreground)] mb-1">CEFR Alignment</label>
                <div className="flex gap-1.5">
                  {CEFR_FIT_LABELS.map((lbl) => (
                    <button key={lbl}
                      onClick={() => setDims((d) => ({ ...d, cefrFitLabel: lbl }))}
                      className={`flex-1 py-1 rounded text-[10px] font-medium border transition-colors ${
                        dims.cefrFitLabel === lbl
                          ? lbl === "TARGET_FIT" ? "bg-emerald-500 text-white border-emerald-500"
                            : lbl === "UNCERTAIN" ? "bg-amber-500 text-white border-amber-500"
                            : "bg-blue-500 text-white border-blue-500"
                          : "border-[var(--border)] text-[var(--muted)]"
                      }`}
                    >
                      {lbl.replace(/_/g, " ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-[var(--foreground)] mb-1">Reviewer Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                placeholder="Optional observations for the item writer…"
                className="w-full text-xs px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
            </div>

            {/* Revision requests (one per line) */}
            {(verdict === "MINOR_REVISION" || verdict === "MAJOR_REVISION") && (
              <div>
                <label className="block text-xs font-medium text-[var(--foreground)] mb-1">Revision Requests (one per line)</label>
                <textarea value={revisionsReq} onChange={(e) => setRevisionsReq(e.target.value)} rows={3}
                  placeholder={"e.g.\nDistractor B is too similar to correct answer\nPassage too short for B2 inference task"}
                  className="w-full text-xs px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none" />
              </div>
            )}

            {/* Red-team checklist (§103) */}
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-2.5">
              <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1">
                <Info size={10} /> Red-Team Checklist (§103)
              </p>
              {[
                "Can I answer without reading the passage?",
                "Does a repeated word in the options reveal the key?",
                "Is the correct option systematically longer?",
                "Does grammar structure reveal the answer?",
                "Could a proficient candidate defend another answer?",
                "Does success depend on cultural knowledge?",
                "Is any distractor absurdly wrong (not plausible)?",
              ].map((q, i) => (
                <p key={i} className="text-[10px] text-[var(--muted)] flex items-start gap-1 mb-0.5">
                  <span className="shrink-0 text-amber-500">→</span>{q}
                </p>
              ))}
            </div>

            {/* EDITING stage: show feedback + re-submit action */}
            {item.pipelineStage === "EDITING" ? (
              <div className="space-y-3">
                {item.itemReviews && item.itemReviews.length > 0 && (
                  <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-3 space-y-2">
                    <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1">
                      <AlertTriangle size={10} /> Reviewer Feedback
                    </p>
                    {item.itemReviews.slice(0, 3).map((rv) => (
                      <div key={rv.id} className="text-[10px] text-[var(--muted)] space-y-1">
                        <p className="font-semibold text-[var(--foreground)]">{rv.verdict.replace(/_/g, " ")} — {rv.reviewType}</p>
                        {rv.notes && <p>"{rv.notes}"</p>}
                        {Array.isArray(rv.revisionsReq) && rv.revisionsReq.length > 0 && (
                          <ul className="list-disc ml-3 space-y-0.5">
                            {rv.revisionsReq.map((req: string, i: number) => <li key={i}>{req}</li>)}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={async () => {
                    setSubmitting(true);
                    try {
                      const r = await fetch(`/api/items/${item.id}/pipeline`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ stage: "LANGUAGE_REVIEW" }),
                      });
                      if (r.ok) {
                        setSubmitOk(true);
                        setTimeout(async () => {
                          const updated = await fetch(`/api/items?stage=EDITING&limit=50`).then((r) => r.json());
                          if (Array.isArray(updated)) setItems(updated);
                        }, 1000);
                      } else {
                        const d = await r.json();
                        setSubmitErr(d.error ?? "Failed");
                      }
                    } catch (e) { setSubmitErr((e as Error).message); }
                    finally { setSubmitting(false); }
                  }}
                  disabled={submitting || submitOk}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                >
                  {submitting ? <><RefreshCw size={13} className="animate-spin" /> Submitting…</> :
                   submitOk ? <><CheckCircle2 size={13} /> Re-submitted!</> :
                   "Submit for Re-review →"}
                </button>
              </div>
            ) : (
              <>
                {/* Verdict */}
                <div>
                  <p className="text-xs font-medium text-[var(--foreground)] mb-2">Verdict</p>
                  <div className="flex flex-wrap gap-2">
                    {(["APPROVE", "MINOR_REVISION", "MAJOR_REVISION", "REJECT"] as Verdict[]).map((v) => (
                      <VerdictBtn key={v} verdict={v} active={verdict === v} onClick={() => setVerdict(v)} />
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!verdict || submitting || submitOk}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                >
                  {submitting ? <><RefreshCw size={13} className="animate-spin" /> Submitting…</> :
                   submitOk ? <><CheckCircle2 size={13} /> Submitted!</> :
                   "Submit Review"}
                </button>

                {submitErr && (
                  <p className="text-xs text-red-500 flex items-center gap-1"><AlertTriangle size={12} />{submitErr}</p>
                )}

                {/* Stage advance info */}
                {stageCfg?.next && (
                  <p className="text-[10px] text-[var(--muted)] flex items-start gap-1">
                    <Clock size={10} className="mt-0.5 shrink-0" />
                    APPROVE → item advances to <strong className="text-[var(--foreground)]">{stageCfg.next}</strong>.
                    REJECT/REVISION → item returns to author for revision.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
