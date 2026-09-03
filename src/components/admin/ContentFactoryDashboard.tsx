/**
 * Content Factory Dashboard — Command Center
 * §98 Factory Command Center + §199 Content Inventory + Gap Matrix
 */
import { useState, useEffect, useCallback } from "react";
import {
  BarChart3, CheckCircle2, Clock, AlertTriangle, Layers,
  TrendingUp, FileText, ChevronDown, ChevronUp, RefreshCw,
  Target, Shield, Zap, BookOpen, Headphones, PenLine, Mic,
  BookMarked, Hash, Activity, FlaskConical, ArrowRight, Settings2,
} from "lucide-react";
import { ContentFactoryOpsPanel } from "./ContentFactoryOpsPanel";
import { ContentFactoryItemForm } from "./ContentFactoryItemForm";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CoverageData {
  heatmap: Record<string, Record<string, number>>;
  byPipeline: Record<string, number>;
  byStatus: Record<string, number>;
  gaps: Array<{ cefr: string; skill: string; have: number; need: number; priority: "HIGH" | "MEDIUM" | "LOW" }>;
  totalItems: number;
  liveItems: number;
  pilotItems: number;
  draftItems: number;
  phase1TargetPct: number;
}

interface DashboardData {
  total: number;
  live: number;
  pilot: number;
  draft: number;
  review: number;
  retired: number;
  awaitingReview: number;
  flagged: number;
  recentReviews: Array<{ id: string; itemId: string; reviewType: string; verdict: string; createdAt: string }>;
}

interface MonitorItem {
  id: string;
  itemCode: string | null;
  skill: string;
  cefrLevel: string;
  subskill: string | null;
  pipelineStage: string;
  nResponses: number;
  pValue: number | null;
  expectedP: number;
  drift: number | null;
  avgLatencyMs: number | null;
  iqScore: number | null;
  difStatus: string;
  calibrationReady: boolean;
  isDrifting: boolean;
  status: string;
  daysInPilot: number;
}

interface MonitorSummary {
  total: number;
  collecting: number;
  calibrationReady: number;
  drifting: number;
  difFlagged: number;
  awaitingExposure: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CEFR_ORDER = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
const SKILLS = ["READING", "LISTENING", "WRITING", "SPEAKING", "GRAMMAR", "VOCABULARY"];
const PHASE1_TARGET = 50;

const SKILL_ICONS: Record<string, React.ReactNode> = {
  READING: <BookOpen size={13} />,
  LISTENING: <Headphones size={13} />,
  WRITING: <PenLine size={13} />,
  SPEAKING: <Mic size={13} />,
  GRAMMAR: <BookMarked size={13} />,
  VOCABULARY: <Hash size={13} />,
};

const PIPELINE_LABELS: Record<string, string> = {
  AI_DRAFT: "AI Draft",
  HUMAN_DRAFT: "Human Draft",
  EDITING: "Editing",
  LANGUAGE_REVIEW: "Language Review",
  CEFR_REVIEW: "CEFR Review",
  FAIRNESS_REVIEW: "Fairness Review",
  MODERATION: "Moderation",
  APPROVED_FOR_PILOT: "Approved for Pilot",
  PILOT: "Pilot",
  ANALYSIS: "Analysis",
  CALIBRATION: "Calibration",
  LIVE: "Live",
  FLAGGED: "Flagged",
  SUSPENDED: "Suspended",
  RETIRED: "Retired",
  COMPROMISED: "Compromised",
};

// ── Heat cell ─────────────────────────────────────────────────────────────────

function HeatCell({ count, target = PHASE1_TARGET }: { count: number; target?: number }) {
  const pct = Math.min(1, count / target);
  const bg =
    count === 0 ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400" :
    pct < 0.4 ? "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400" :
    pct < 0.8 ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400" :
    "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400";
  return (
    <td className={`text-center text-xs font-mono py-2 px-1 border border-white/10 ${bg}`}>
      {count}
    </td>
  );
}

// ── Pipeline bar ──────────────────────────────────────────────────────────────

function PipelineBar({ byPipeline, total }: { byPipeline: Record<string, number>; total: number }) {
  const segments = [
    { keys: ["AI_DRAFT", "HUMAN_DRAFT", "EDITING"], label: "Drafting", color: "bg-slate-400" },
    { keys: ["LANGUAGE_REVIEW", "CEFR_REVIEW", "FAIRNESS_REVIEW", "MODERATION"], label: "Review", color: "bg-amber-400" },
    { keys: ["APPROVED_FOR_PILOT", "PILOT", "ANALYSIS"], label: "Piloting", color: "bg-blue-400" },
    { keys: ["CALIBRATION"], label: "Calibration", color: "bg-purple-400" },
    { keys: ["LIVE"], label: "Live", color: "bg-emerald-500" },
    { keys: ["FLAGGED", "SUSPENDED", "COMPROMISED"], label: "Issues", color: "bg-red-400" },
    { keys: ["RETIRED"], label: "Retired", color: "bg-gray-300" },
  ];

  return (
    <div>
      <div className="flex h-5 rounded overflow-hidden gap-px">
        {segments.map((seg) => {
          const count = seg.keys.reduce((s, k) => s + (byPipeline[k] ?? 0), 0);
          const w = total > 0 ? (count / total) * 100 : 0;
          if (w < 1 && count === 0) return null;
          return (
            <div
              key={seg.label}
              className={`${seg.color} transition-all`}
              style={{ width: `${Math.max(w, 1)}%` }}
              title={`${seg.label}: ${count}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-2">
        {segments.map((seg) => {
          const count = seg.keys.reduce((s, k) => s + (byPipeline[k] ?? 0), 0);
          if (count === 0) return null;
          return (
            <span key={seg.label} className="flex items-center gap-1 text-xs text-[var(--muted)]">
              <span className={`inline-block w-2.5 h-2.5 rounded-sm ${seg.color}`} />
              {seg.label}: {count}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function ContentFactoryDashboard() {
  const [coverage, setCoverage] = useState<CoverageData | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "heatmap" | "gaps" | "pipeline" | "review" | "scale-gate" | "monitor" | "ops" | "author">("overview");
  const [gapsExpanded, setGapsExpanded] = useState(false);
  const [scaleGate, setScaleGate] = useState<Record<string, unknown> | null>(null);
  const [scaleGateLoading, setScaleGateLoading] = useState(false);
  const [monitorData, setMonitorData] = useState<{ items: MonitorItem[]; summary: MonitorSummary; calibrationThreshold: number } | null>(null);
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [pilotPromoting, setPilotPromoting] = useState(false);
  const [calPromoting, setCalPromoting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cov, dash] = await Promise.all([
        fetch("/api/content/coverage").then((r) => r.json()),
        fetch("/api/content/dashboard").then((r) => r.json()),
      ]);
      setCoverage(cov);
      setDashboard(dash);
    } catch {
      // silently handle — show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--muted)]">
        <RefreshCw size={18} className="animate-spin mr-2" /> Loading Content Factory…
      </div>
    );
  }

  const d = dashboard;
  const c = coverage;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--foreground)]">Content Factory</h2>
          <p className="text-sm text-[var(--muted)] mt-0.5">
            Item bank health · pipeline · CEFR × Skill coverage
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Items", value: d?.total ?? 0, icon: <Layers size={16} />, color: "text-blue-500" },
          { label: "Live (Active)", value: d?.live ?? 0, icon: <CheckCircle2 size={16} />, color: "text-emerald-500" },
          { label: "In Pilot", value: d?.pilot ?? 0, icon: <Zap size={16} />, color: "text-purple-500" },
          { label: "Awaiting Review", value: d?.awaitingReview ?? 0, icon: <Clock size={16} />, color: "text-amber-500" },
          { label: "Draft", value: d?.draft ?? 0, icon: <FileText size={16} />, color: "text-slate-500" },
          { label: "In Review", value: d?.review ?? 0, icon: <BarChart3 size={16} />, color: "text-blue-400" },
          { label: "Flagged", value: d?.flagged ?? 0, icon: <AlertTriangle size={16} />, color: "text-red-500" },
          { label: "Phase 1 Progress", value: `${c?.phase1TargetPct ?? 0}%`, icon: <Target size={16} />, color: "text-teal-500" },
        ].map((tile) => (
          <div key={tile.label} className="rounded-xl border border-[var(--border)] p-3 bg-[var(--card)]">
            <div className={`${tile.color} mb-1`}>{tile.icon}</div>
            <div className="text-2xl font-bold text-[var(--foreground)]">{tile.value}</div>
            <div className="text-xs text-[var(--muted)]">{tile.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--border)]">
        {(["overview", "heatmap", "gaps", "pipeline", "review", "scale-gate", "monitor", "ops", "author"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              if (tab === "scale-gate" && !scaleGate) {
                setScaleGateLoading(true);
                fetch("/api/content/scale-gate")
                  .then((r) => r.json())
                  .then((d) => setScaleGate(d))
                  .catch(() => setScaleGate({ error: "Failed to load" }))
                  .finally(() => setScaleGateLoading(false));
              }
              if (tab === "monitor" && !monitorData) {
                setMonitorLoading(true);
                fetch("/api/content/monitor")
                  .then((r) => r.json())
                  .then((d) => setMonitorData(d))
                  .catch(() => setMonitorData(null))
                  .finally(() => setMonitorLoading(false));
              }
            }}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-blue-500 text-blue-500"
                : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {tab === "heatmap" ? "Coverage Heatmap" : tab === "overview" ? "Overview" : tab === "gaps" ? "Gap Matrix" : tab === "pipeline" ? "Pipeline" : tab === "review" ? "Reviews" : tab === "scale-gate" ? "Scale Gate" : tab === "monitor" ? "Monitor" : tab === "author" ? "Author Item" : "Ops"}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === "overview" && c && d && (
        <div className="space-y-5">
          <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--card)]">
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Item Pipeline Distribution</h3>
            <PipelineBar byPipeline={c.byPipeline} total={d.total} />
          </div>

          <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--card)]">
            <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">
              Top Priority Gaps
              <span className="ml-2 text-xs font-normal text-[var(--muted)]">(Phase 1 target: {PHASE1_TARGET} items/cell)</span>
            </h3>
            <div className="space-y-2">
              {(c.gaps ?? []).slice(0, gapsExpanded ? 20 : 5).map((g, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={`text-xs font-mono w-16 shrink-0 ${
                    g.priority === "HIGH" ? "text-red-500" :
                    g.priority === "MEDIUM" ? "text-amber-500" : "text-yellow-500"
                  }`}>{g.priority}</span>
                  <span className="text-xs text-[var(--muted)] w-8 shrink-0">{g.cefr}</span>
                  <span className="flex items-center gap-1 text-xs text-[var(--foreground)] w-28 shrink-0">
                    {SKILL_ICONS[g.skill]} {g.skill}
                  </span>
                  <div className="flex-1 bg-[var(--muted)]/10 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        g.priority === "HIGH" ? "bg-red-500" :
                        g.priority === "MEDIUM" ? "bg-amber-500" : "bg-yellow-400"
                      }`}
                      style={{ width: `${Math.min(100, (g.have / PHASE1_TARGET) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-[var(--muted)] w-20 text-right shrink-0">
                    {g.have}/{PHASE1_TARGET} (+{g.need})
                  </span>
                </div>
              ))}
            </div>
            {(c.gaps ?? []).length > 5 && (
              <button
                onClick={() => setGapsExpanded((e) => !e)}
                className="mt-3 flex items-center gap-1 text-xs text-blue-500 hover:underline"
              >
                {gapsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {gapsExpanded ? "Show less" : `Show all ${c.gaps.length} gaps`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Heatmap tab */}
      {activeTab === "heatmap" && c && (
        <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--card)] overflow-x-auto">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1">CEFR × Skill Coverage Matrix</h3>
          <p className="text-xs text-[var(--muted)] mb-4">
            Cell shows item count. Target: {PHASE1_TARGET}+ per cell.
            <span className="ml-3 inline-flex gap-2">
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400">0</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400">&lt;20</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400">&lt;40</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">50+</span>
            </span>
          </p>
          <table className="text-xs border-collapse w-full">
            <thead>
              <tr>
                <th className="text-left py-2 pr-3 text-[var(--muted)] font-medium w-16">CEFR</th>
                {SKILLS.map((s) => (
                  <th key={s} className="text-center py-2 px-1 text-[var(--muted)] font-medium">
                    <span className="flex flex-col items-center gap-0.5">
                      {SKILL_ICONS[s]}
                      <span className="hidden sm:inline text-[10px]">{s.slice(0, 4)}</span>
                    </span>
                  </th>
                ))}
                <th className="text-center py-2 px-1 text-[var(--muted)] font-medium text-[10px]">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {CEFR_ORDER.map((cefr) => {
                const row = c.heatmap[cefr] ?? {};
                const rowTotal = SKILLS.reduce((s, sk) => s + (row[sk] ?? 0), 0);
                return (
                  <tr key={cefr}>
                    <td className="py-2 pr-3 font-mono text-xs text-[var(--foreground)] font-semibold">{cefr}</td>
                    {SKILLS.map((sk) => (
                      <HeatCell key={sk} count={row[sk] ?? 0} />
                    ))}
                    <td className="text-center text-xs font-mono py-2 px-1 text-[var(--muted)] border border-white/10">
                      {rowTotal}
                    </td>
                  </tr>
                );
              })}
              <tr className="border-t border-[var(--border)]">
                <td className="py-2 pr-3 text-xs text-[var(--muted)] font-medium">TOTAL</td>
                {SKILLS.map((sk) => {
                  const total = CEFR_ORDER.reduce((s, cefr) => s + (c.heatmap[cefr]?.[sk] ?? 0), 0);
                  return (
                    <td key={sk} className="text-center text-xs font-mono py-2 px-1 text-[var(--muted)]">
                      {total}
                    </td>
                  );
                })}
                <td className="text-center text-xs font-mono py-2 px-1 font-bold text-[var(--foreground)]">
                  {c.totalItems}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Gaps tab */}
      {activeTab === "gaps" && c && (
        <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--card)]">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-1">Content Production Queue</h3>
          <p className="text-xs text-[var(--muted)] mb-4">
            Automatically calculated from bank depth vs Phase 1 target ({PHASE1_TARGET} items/cell).
            Sorted by production priority.
          </p>
          {(c.gaps ?? []).length === 0 ? (
            <div className="flex items-center gap-2 text-emerald-500 text-sm">
              <CheckCircle2 size={16} /> Phase 1 coverage target met across all cells.
            </div>
          ) : (
            <div className="space-y-1">
              {(c.gaps ?? []).map((g, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    g.priority === "HIGH"
                      ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"
                      : g.priority === "MEDIUM"
                      ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
                      : "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400"
                  }`}>
                    {g.priority}
                  </span>
                  <span className="font-mono text-xs font-semibold text-[var(--foreground)] w-12">{g.cefr}</span>
                  <span className="flex items-center gap-1 text-xs text-[var(--foreground)] flex-1">
                    {SKILL_ICONS[g.skill]} {g.skill}
                  </span>
                  <span className="text-xs text-[var(--muted)]">
                    Have: <strong className="text-[var(--foreground)]">{g.have}</strong>
                  </span>
                  <span className="text-xs text-red-500 font-medium">
                    Need: +{g.need}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pipeline tab */}
      {activeTab === "pipeline" && c && (
        <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--card)]">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Pipeline Stage Breakdown</h3>
          <div className="space-y-2">
            {Object.entries(PIPELINE_LABELS).map(([key, label]) => {
              const count = c.byPipeline[key] ?? 0;
              const pct = c.totalItems > 0 ? (count / c.totalItems) * 100 : 0;
              if (count === 0 && !["AI_DRAFT", "LANGUAGE_REVIEW", "CEFR_REVIEW", "LIVE", "PILOT"].includes(key)) return null;
              const isIssue = ["FLAGGED", "SUSPENDED", "COMPROMISED"].includes(key);
              const isGood = key === "LIVE";
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-[var(--muted)] w-40 shrink-0">{label}</span>
                  <div className="flex-1 bg-[var(--muted)]/10 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isIssue ? "bg-red-400" : isGood ? "bg-emerald-500" : "bg-blue-400"}`}
                      style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-mono w-12 text-right shrink-0 ${isIssue && count > 0 ? "text-red-500 font-bold" : "text-[var(--muted)]"}`}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-6 p-3 rounded-lg bg-[var(--muted)]/5 border border-[var(--border)]">
            <h4 className="text-xs font-semibold text-[var(--foreground)] mb-2">Pipeline — Spec → Create → Review → Pilot → Calibrate → Deploy</h4>
            <p className="text-xs text-[var(--muted)]">
              Items advance through the editorial pipeline before reaching Live status.
              Use <code className="bg-[var(--muted)]/10 px-1 rounded">POST /api/items/:id/pipeline</code> to advance stages
              or <code className="bg-[var(--muted)]/10 px-1 rounded">POST /api/items/:id/review</code> to submit a review verdict.
            </p>
          </div>
        </div>
      )}

      {/* Review tab */}
      {activeTab === "review" && d && (
        <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--card)]">
          <h3 className="text-sm font-semibold text-[var(--foreground)] mb-4">Recent Reviews</h3>
          {d.recentReviews.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No reviews submitted yet.</p>
          ) : (
            <div className="space-y-2">
              {d.recentReviews.map((r) => (
                <div key={r.id} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0 text-xs">
                  <span className={`px-2 py-0.5 rounded-full font-medium ${
                    r.verdict === "APPROVE" ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400" :
                    r.verdict === "REJECT" ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400" :
                    "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
                  }`}>
                    {r.verdict}
                  </span>
                  <span className="text-[var(--muted)]">{r.reviewType}</span>
                  <span className="font-mono text-[var(--foreground)] flex-1 truncate">{r.itemId}</span>
                  <span className="text-[var(--muted)] shrink-0">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
              <Shield size={14} />
              <span className="text-xs font-semibold">Review Roles</span>
            </div>
            <p className="text-xs text-[var(--muted)]">
              <strong>LANGUAGE_REVIEWER</strong> — naturalness &amp; accuracy ·{" "}
              <strong>CEFR_REVIEWER</strong> — level alignment ·{" "}
              <strong>MODERATOR</strong> — final pre-pilot gate ·{" "}
              <strong>ASSESSMENT_DIRECTOR</strong> — release sign-off
            </p>
          </div>
        </div>
      )}

      {/* Scale Gate tab (§192) */}
      {activeTab === "scale-gate" && (
        <div className="space-y-4">
          {scaleGateLoading && (
            <div className="flex items-center justify-center h-40 text-[var(--muted)] text-sm">
              <RefreshCw size={15} className="animate-spin mr-2" /> Evaluating scale gate…
            </div>
          )}
          {!scaleGateLoading && scaleGate && !(scaleGate as any).error && (() => {
            const sg = scaleGate as any;
            const rec: string = sg.recommendation ?? "";
            const isReady = rec.startsWith("READY");
            return (
              <div className="space-y-4">
                {/* Recommendation banner */}
                <div className={`rounded-xl border p-4 ${isReady ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20" : "border-amber-300 bg-amber-50 dark:bg-amber-900/20"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {isReady
                      ? <CheckCircle2 size={16} className="text-emerald-500" />
                      : <AlertTriangle size={16} className="text-amber-500" />}
                    <span className={`text-sm font-bold ${isReady ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
                      {isReady ? "Ready to Scale" : "Scale Gate: Not Ready"}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)]">{rec.replace(/^[A-Z_]+: /, "")}</p>
                </div>

                {/* Gate checklist */}
                <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--card)]">
                  <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">§192 Gate Checks</h4>
                  {[
                    { key: "minSampleReached", label: "≥ 20 items reviewed", desc: `${sg.snapshot?.totalReviews ?? 0} reviews recorded` },
                    { key: "rejectionRateOk", label: "Rejection rate < 30%", desc: sg.rates?.rejectionRate != null ? `${(sg.rates.rejectionRate * 100).toFixed(1)}%` : "No data" },
                    { key: "reviewerAgreementOk", label: "Reviewer agreement ≥ 80%", desc: sg.rates?.reviewerAgreement != null ? `${(sg.rates.reviewerAgreement * 100).toFixed(1)}%` : "Insufficient multi-reviewed items" },
                    { key: "cefrFitOk", label: "Avg CEFR fit score ≥ 65", desc: `Avg: ${sg.avgDimensionScores?.cefrFit ?? "—"} / 100` },
                  ].map(({ key, label, desc }) => {
                    const v = sg.gates?.[key];
                    return (
                      <div key={key} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
                        {v === true ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0" /> :
                         v === false ? <AlertTriangle size={14} className="text-amber-500 shrink-0" /> :
                         <Clock size={14} className="text-[var(--muted)] shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[var(--foreground)]">{label}</p>
                          <p className="text-[10px] text-[var(--muted)]">{desc}</p>
                        </div>
                        <span className={`text-[10px] font-bold ${v === true ? "text-emerald-500" : v === false ? "text-amber-500" : "text-[var(--muted)]"}`}>
                          {v === true ? "PASS" : v === false ? "FAIL" : "N/A"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Dimension averages */}
                <div className="rounded-xl border border-[var(--border)] p-4 bg-[var(--card)]">
                  <h4 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-3">Avg Reviewer Dimension Scores</h4>
                  {Object.entries(sg.avgDimensionScores ?? {}).map(([dim, score]) => {
                    const v = score as number;
                    return (
                      <div key={dim} className="flex items-center gap-3 mb-2 last:mb-0">
                        <span className="text-xs text-[var(--muted)] w-44 shrink-0 capitalize">{dim.replace(/([A-Z])/g, " $1").trim()}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-[var(--muted)]/20 overflow-hidden">
                          <div className={`h-full rounded-full ${v >= 70 ? "bg-emerald-500" : v >= 50 ? "bg-amber-400" : "bg-red-400"}`} style={{ width: `${v}%` }} />
                        </div>
                        <span className={`text-xs font-bold tabular-nums w-8 text-right ${v >= 70 ? "text-emerald-500" : v >= 50 ? "text-amber-500" : "text-red-500"}`}>{v}</span>
                      </div>
                    );
                  })}
                  <p className="text-[10px] text-[var(--muted)] mt-3">Based on {sg.snapshot?.totalReviews ?? 0} recent reviews.</p>
                </div>

                {/* Rate snapshot */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Approval Rate", v: sg.rates?.approvalRate, format: (n: number) => `${(n * 100).toFixed(1)}%`, good: (n: number) => n >= 0.7 },
                    { label: "Rejection Rate", v: sg.rates?.rejectionRate, format: (n: number) => `${(n * 100).toFixed(1)}%`, good: (n: number) => n < 0.3 },
                    { label: "Reviewer Agreement", v: sg.rates?.reviewerAgreement, format: (n: number) => `${(n * 100).toFixed(1)}%`, good: (n: number) => n >= 0.8 },
                    { label: "Near-Match Warning Rate", v: sg.rates?.duplicateWarningRate, format: (n: number) => `${(n * 100).toFixed(1)}%`, good: (n: number) => n < 0.15 },
                  ].map(({ label, v, format, good }) => (
                    <div key={label} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
                      <p className="text-[10px] text-[var(--muted)] mb-0.5">{label}</p>
                      <p className={`text-xl font-bold ${v == null ? "text-[var(--muted)]" : good(v) ? "text-emerald-500" : "text-amber-500"}`}>
                        {v == null ? "—" : format(v)}
                      </p>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setScaleGate(null);
                    setScaleGateLoading(true);
                    fetch("/api/content/scale-gate").then((r) => r.json()).then(setScaleGate).catch(() => setScaleGate({ error: "Failed" })).finally(() => setScaleGateLoading(false));
                  }}
                  className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  <RefreshCw size={11} /> Refresh
                </button>
              </div>
            );
          })()}
          {!scaleGateLoading && scaleGate && (scaleGate as any).error && (
            <p className="text-sm text-red-500">{(scaleGate as any).error}</p>
          )}
          {!scaleGateLoading && !scaleGate && (
            <p className="text-sm text-[var(--muted)]">Click the Scale Gate tab to evaluate readiness.</p>
          )}
        </div>
      )}

      {/* Monitor tab */}
      {activeTab === "monitor" && (
        <div className="space-y-4">
          {/* Action bar */}
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={async () => {
                setPilotPromoting(true);
                try {
                  const r = await fetch("/api/content/pilot/promote", { method: "POST" });
                  const d = await r.json();
                  alert(`Promoted ${d.promoted ?? 0} items to PILOT (PRETEST) status.`);
                  setMonitorData(null);
                  setMonitorLoading(true);
                  fetch("/api/content/monitor").then((r) => r.json()).then(setMonitorData).finally(() => setMonitorLoading(false));
                } catch { alert("Promotion failed"); }
                finally { setPilotPromoting(false); }
              }}
              disabled={pilotPromoting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-300 dark:border-blue-700 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 transition-colors"
            >
              {pilotPromoting ? <RefreshCw size={11} className="animate-spin" /> : <FlaskConical size={11} />}
              Promote APPROVED → PILOT
            </button>
            <button
              onClick={async () => {
                setCalPromoting(true);
                try {
                  const r = await fetch("/api/content/calibration/promote", { method: "POST" });
                  const d = await r.json();
                  alert(`Promoted ${d.promoted ?? 0} items to CALIBRATION stage.`);
                  setMonitorData(null);
                  setMonitorLoading(true);
                  fetch("/api/content/monitor").then((r) => r.json()).then(setMonitorData).finally(() => setMonitorLoading(false));
                } catch { alert("Calibration promotion failed"); }
                finally { setCalPromoting(false); }
              }}
              disabled={calPromoting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-300 dark:border-purple-700 text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 disabled:opacity-50 transition-colors"
            >
              {calPromoting ? <RefreshCw size={11} className="animate-spin" /> : <ArrowRight size={11} />}
              Promote Calibration-Ready → CALIBRATION
            </button>
            <button
              onClick={() => {
                setMonitorLoading(true);
                fetch("/api/content/monitor").then((r) => r.json()).then(setMonitorData).catch(() => {}).finally(() => setMonitorLoading(false));
              }}
              className="ml-auto flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <RefreshCw size={11} /> Refresh
            </button>
          </div>

          {monitorLoading && (
            <div className="flex items-center justify-center h-40 text-[var(--muted)] text-sm">
              <RefreshCw size={15} className="animate-spin mr-2" /> Loading pilot monitor…
            </div>
          )}

          {!monitorLoading && monitorData && (
            <>
              {/* Summary KPIs */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  { label: "In Pilot", value: monitorData.summary.total, icon: <Activity size={13} />, color: "text-blue-500" },
                  { label: "Collecting", value: monitorData.summary.collecting, icon: <BarChart3 size={13} />, color: "text-emerald-500" },
                  { label: "Cal. Ready", value: monitorData.summary.calibrationReady, icon: <CheckCircle2 size={13} />, color: "text-purple-500" },
                  { label: "Drifting", value: monitorData.summary.drifting, icon: <AlertTriangle size={13} />, color: "text-amber-500" },
                  { label: "DIF Flagged", value: monitorData.summary.difFlagged, icon: <Shield size={13} />, color: "text-red-500" },
                  { label: "No Exposure", value: monitorData.summary.awaitingExposure, icon: <Clock size={13} />, color: "text-[var(--muted)]" },
                ].map((k) => (
                  <div key={k.label} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-2 text-center">
                    <div className={`flex justify-center mb-0.5 ${k.color}`}>{k.icon}</div>
                    <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
                    <p className="text-[10px] text-[var(--muted)]">{k.label}</p>
                  </div>
                ))}
              </div>

              {/* Item table */}
              {monitorData.items.length === 0 ? (
                <div className="rounded-xl border border-[var(--border)] p-8 text-center text-[var(--muted)] text-sm">
                  No items in PILOT or CALIBRATION stage yet.<br />
                  <span className="text-xs">Use "Promote APPROVED → PILOT" above after items pass Moderation.</span>
                </div>
              ) : (
                <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--card)]">
                          {["Code", "Skill", "CEFR", "Stage", "Responses", "p-val", "Exp. p", "Drift", "IQS", "DIF", "Status", "Days", ""].map((h) => (
                            <th key={h} className="text-left text-[var(--muted)] font-medium py-2 px-2 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {monitorData.items.map((item) => {
                          const statusColor =
                            item.status === "CALIBRATION_READY" ? "text-purple-500 font-bold" :
                            item.status === "DRIFTING" ? "text-amber-500 font-bold" :
                            item.status === "DIF_FLAGGED" ? "text-red-500 font-bold" :
                            item.status === "COLLECTING" ? "text-emerald-500" :
                            "text-[var(--muted)]";
                          const progressPct = Math.min((item.nResponses / (monitorData.calibrationThreshold)) * 100, 100);
                          return (
                            <tr key={item.id} className="border-b border-[var(--border)] hover:bg-[var(--card)]">
                              <td className="py-1.5 px-2 font-mono text-[var(--foreground)]">{item.itemCode ?? item.id.slice(0, 8)}</td>
                              <td className="py-1.5 px-2 text-[var(--muted)]">{item.skill.slice(0, 4)}</td>
                              <td className="py-1.5 px-2">
                                <span className="px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 font-medium">{item.cefrLevel}</span>
                              </td>
                              <td className="py-1.5 px-2 text-[var(--muted)]">{item.pipelineStage.replace(/_/g, " ")}</td>
                              <td className="py-1.5 px-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="tabular-nums text-[var(--foreground)]">{item.nResponses}</span>
                                  <div className="w-12 h-1 rounded-full bg-[var(--muted)]/20 overflow-hidden">
                                    <div className="h-full rounded-full bg-blue-400" style={{ width: `${progressPct}%` }} />
                                  </div>
                                </div>
                              </td>
                              <td className="py-1.5 px-2 tabular-nums text-[var(--foreground)]">{item.pValue?.toFixed(2) ?? "—"}</td>
                              <td className="py-1.5 px-2 tabular-nums text-[var(--muted)]">{item.expectedP.toFixed(2)}</td>
                              <td className={`py-1.5 px-2 tabular-nums ${item.isDrifting ? "text-amber-500 font-bold" : "text-[var(--muted)]"}`}>
                                {item.drift?.toFixed(2) ?? "—"}
                              </td>
                              <td className={`py-1.5 px-2 tabular-nums ${(item.iqScore ?? 0) >= 80 ? "text-emerald-500" : (item.iqScore ?? 0) >= 65 ? "text-amber-500" : "text-red-400"}`}>
                                {item.iqScore != null ? Math.round(item.iqScore) : "—"}
                              </td>
                              <td className={`py-1.5 px-2 ${item.difStatus === "FLAGGED" ? "text-red-500 font-bold" : "text-[var(--muted)]"}`}>
                                {item.difStatus}
                              </td>
                              <td className={`py-1.5 px-2 whitespace-nowrap ${statusColor}`}>
                                {item.status.replace(/_/g, " ")}
                              </td>
                              <td className="py-1.5 px-2 tabular-nums text-[var(--muted)]">{item.daysInPilot}d</td>
                              <td className="py-1.5 px-2">
                                {item.isDrifting && (
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Suspend ${item.itemCode ?? item.id}? This will stop it being served in sessions.`)) return;
                                      await fetch(`/api/items/${item.id}/suspend`, {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ suspend: true, note: "Suspended from monitor: drift > 0.20" }),
                                      });
                                      setMonitorData(null);
                                      setMonitorLoading(true);
                                      fetch("/api/content/monitor").then((r) => r.json()).then(setMonitorData).finally(() => setMonitorLoading(false));
                                    }}
                                    className="text-[10px] px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 whitespace-nowrap"
                                  >
                                    Suspend
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-2 bg-[var(--card)] border-t border-[var(--border)]">
                    <p className="text-[10px] text-[var(--muted)]">
                      Calibration threshold: {monitorData.calibrationThreshold} responses + IQS ≥ 65.
                      Drift = |observed p − IRT-expected p at θ=0|. Drift {">"} 0.20 flagged.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {!monitorLoading && !monitorData && (
            <p className="text-sm text-[var(--muted)]">Click Monitor tab to load pilot health data.</p>
          )}
        </div>
      )}

      {/* Ops tab */}
      {activeTab === "ops" && <ContentFactoryOpsPanel />}

      {activeTab === "author" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--foreground)]">Human Item Authoring</h3>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              Create items from scratch (HUMAN_DRAFT). Items enter the review pipeline automatically after submission.
            </p>
          </div>
          <ContentFactoryItemForm onSuccess={(id, code) => {
            // Refresh the overview data after successful item creation
            fetch("/api/content/overview").then(() => {}).catch(() => {});
          }} />
        </div>
      )}

      {/* North Star reminder */}
      <div className="rounded-xl border border-[var(--border)] p-4 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10">
        <div className="flex items-center gap-2 text-[var(--foreground)] mb-1">
          <TrendingUp size={14} className="text-blue-500" />
          <span className="text-sm font-semibold">Content Factory North Star</span>
        </div>
        <p className="text-xs text-[var(--muted)]">
          Optimise for <strong>valid assessment information per candidate minute</strong>, not item count.
          Pipeline: <span className="font-mono">SPECIFY → CREATE → REVIEW → PILOT → CALIBRATE → DEPLOY → MONITOR → IMPROVE</span>
        </p>
      </div>
    </div>
  );
}
