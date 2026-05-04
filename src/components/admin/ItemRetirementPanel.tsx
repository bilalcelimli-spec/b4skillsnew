/**
 * Item Retirement Panel
 *
 * Admin UI for automated item quality monitoring and retirement.
 *
 * Retirement score (0–1) is computed from four psychometric factors:
 *   40% discrimination (a-parameter quality)
 *   25% IRT model fit residuals
 *   20% p-value (item difficulty in observed data)
 *   15% item-total correlation with session θ
 *
 * Thresholds:
 *   score ≥ 0.70 → RETIRE
 *   score ≥ 0.60 → REVIEW
 *   score  < 0.60 → KEEP
 *
 * References: Hambleton & Swaminathan (1985), Embretson & Reise (2000)
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  RefreshCw,
  Trash2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Play,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RetirementItem {
  id: string;
  skill: string;
  cefrLevel: string;
  discrimination: number;
  difficulty: number;
  responseCount: number;
  retirementScore: number;
  recommendation: "RETIRE" | "REVIEW" | "KEEP";
  reasoning: string;
  factors: {
    discrim: number;
    fit: number;
    difficulty: number;
    correlation: number;
  };
}

interface BatchSummary {
  total: number;
  retire: number;
  review: number;
  keep: number;
  items: RetirementItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function recColor(r: RetirementItem["recommendation"]) {
  if (r === "RETIRE") return { bg: "bg-red-50",    text: "text-red-700",    border: "border-red-200"   };
  if (r === "REVIEW") return { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200" };
  return                    { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200" };
}

function RecIcon({ r }: { r: RetirementItem["recommendation"] }) {
  if (r === "RETIRE") return <XCircle     className="w-3.5 h-3.5" />;
  if (r === "REVIEW") return <AlertTriangle className="w-3.5 h-3.5" />;
  return <CheckCircle2 className="w-3.5 h-3.5" />;
}

function ScoreBar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`h-2 bg-slate-100 rounded-full overflow-hidden w-16 ${className}`}>
      <motion.div
        className={`h-full rounded-full ${value >= 0.7 ? "bg-red-500" : value >= 0.6 ? "bg-amber-400" : "bg-green-500"}`}
        initial={{ width: 0 }}
        animate={{ width: `${value * 100}%` }}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ItemRetirementPanel() {
  const [data, setData]       = useState<BatchSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [retiring, setRetiring] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter]   = useState<"ALL" | "RETIRE" | "REVIEW" | "KEEP">("ALL");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/items/retirement-scores", { credentials: "include" });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const runBatch = async () => {
    setRunning(true);
    try {
      await fetch("/api/items/retirement-batch-run", { method: "POST", credentials: "include" });
      await load();
    } finally {
      setRunning(false);
    }
  };

  const retireItem = async (itemId: string) => {
    setRetiring(itemId);
    try {
      await fetch(`/api/items/${itemId}/retire`, { method: "POST", credentials: "include" });
      await load();
    } finally {
      setRetiring(null);
    }
  };

  useEffect(() => { load(); }, []);

  const items = data?.items?.filter((i) => filter === "ALL" || i.recommendation === filter) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Item Retirement</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Psychometric quality monitoring — auto-score items for retirement based on IRT fit
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-slate-400 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={runBatch}
            disabled={running}
            className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run Batch Analysis
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {data && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Scored", value: data.total,  bg: "bg-slate-50  text-slate-800"  },
            { label: "Retire",       value: data.retire, bg: "bg-red-50    text-red-700"    },
            { label: "Review",       value: data.review, bg: "bg-amber-50  text-amber-700"  },
            { label: "Keep",         value: data.keep,   bg: "bg-green-50  text-green-700"  },
          ].map((c) => (
            <div key={c.label} className={`rounded-xl p-4 ${c.bg}`}>
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-xs font-medium mt-0.5 opacity-80">{c.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-slate-200 pb-0">
        {(["ALL", "RETIRE", "REVIEW", "KEEP"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
              filter === f
                ? "border-indigo-600 text-indigo-700 bg-indigo-50"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {f === "ALL" ? `All (${data?.total ?? 0})` : f === "RETIRE" ? `Retire (${data?.retire ?? 0})` : f === "REVIEW" ? `Review (${data?.review ?? 0})` : `Keep (${data?.keep ?? 0})`}
          </button>
        ))}
      </div>

      {/* Item list */}
      {loading && !data ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          {data ? "No items match this filter." : "Run batch analysis to score items."}
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {items.map((item) => {
              const colors = recColor(item.recommendation);
              const isExp = expanded === item.id;
              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`border rounded-xl overflow-hidden bg-white ${colors.border}`}
                >
                  {/* Row */}
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExpanded(isExp ? null : item.id)}
                  >
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                      <RecIcon r={item.recommendation} />
                      {item.recommendation}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-mono text-slate-600 truncate">{item.id}</p>
                      <p className="text-xs text-slate-500">
                        {item.skill} · {item.cefrLevel} · {item.responseCount} responses
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-600 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-mono font-semibold">{(item.retirementScore * 100).toFixed(0)}%</p>
                        <p className="text-slate-400">retire score</p>
                      </div>
                      <ScoreBar value={item.retirementScore} />
                    </div>
                    {item.recommendation === "RETIRE" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); retireItem(item.id); }}
                        disabled={retiring === item.id}
                        className="flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 rounded text-xs font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
                      >
                        {retiring === item.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        Retire
                      </button>
                    )}
                    {item.recommendation === "REVIEW" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); /* open content review */ }}
                        className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 rounded text-xs font-medium hover:bg-amber-100 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        Review
                      </button>
                    )}
                    {isExp ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  </div>

                  {/* Factor breakdown */}
                  <AnimatePresence>
                    {isExp && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-3"
                      >
                        <p className="text-xs text-slate-600">{item.reasoning}</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { label: "Discrimination (40%)", value: item.factors.discrim, hint: `a = ${item.discrimination.toFixed(2)}` },
                            { label: "Model Fit (25%)",       value: item.factors.fit,     hint: "IRT residual proportion" },
                            { label: "Difficulty (20%)",      value: item.factors.difficulty, hint: `b = ${item.difficulty.toFixed(2)}` },
                            { label: "Item-Total r (15%)",    value: item.factors.correlation, hint: "Pearson r with θ" },
                          ].map((f) => (
                            <div key={f.label} className="bg-white rounded-lg p-3 border border-slate-100">
                              <div className="flex justify-between items-baseline mb-1">
                                <span className="text-xs text-slate-500 leading-tight">{f.label}</span>
                                <span className={`text-xs font-bold ${f.value >= 0.7 ? "text-red-700" : f.value >= 0.4 ? "text-amber-700" : "text-green-700"}`}>
                                  {(f.value * 100).toFixed(0)}%
                                </span>
                              </div>
                              <ScoreBar value={f.value} className="w-full" />
                              <p className="text-xs text-slate-400 mt-1">{f.hint}</p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
