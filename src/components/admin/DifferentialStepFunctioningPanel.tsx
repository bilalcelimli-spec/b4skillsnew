import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, Layers, CheckCircle2, AlertTriangle, BarChart3 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StepResult {
  step: number;           // step transition (e.g. 0→1, 1→2, …)
  stepLabel: string;      // "Step 1", "Step 2", …
  dsfStat: number;        // Mantel–Haenszel-like DSF chi-square statistic
  dsfDelta: number;       // effect size (log-odds-ratio)
  pValue: number;
  nFocal: number;
  nReference: number;
  flagged: boolean;
}

interface DSFItem {
  itemId: string;
  itemLabel: string;
  skill: string;
  cefrLevel: string;
  nCategories: number;
  nFocal: number;
  nReference: number;
  maxDSFStat: number;
  nFlaggedSteps: number;
  flagged: boolean;
  steps: StepResult[];
}

interface DSFPayload {
  totalItems: number;
  flaggedItems: number;
  totalFlaggedSteps: number;
  groupingMethod: string;
  items: DSFItem[];
  categoryDistribution: { nCats: string; count: number }[];
  dsfStatDistribution: { bin: string; count: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SKILL_COLORS: Record<string, string> = {
  GRAMMAR: "#6366f1", VOCABULARY: "#8b5cf6", READING: "#3b82f6",
  LISTENING: "#06b6d4", WRITING: "#10b981", SPEAKING: "#f59e0b",
};

const STEP_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];

function StepProfile({ steps }: { steps: StepResult[] }) {
  const max = Math.max(3.84, ...steps.map((s) => s.dsfStat));
  return (
    <div className="space-y-1">
      {steps.map((s, i) => (
        <div key={s.step} className="flex items-center gap-2 text-xs">
          <span className="w-14 text-slate-400 shrink-0">{s.stepLabel}</span>
          <div className="flex-1 bg-slate-800 rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (s.dsfStat / max) * 100)}%`,
                background: s.flagged ? "#ef4444" : STEP_COLORS[i % STEP_COLORS.length],
              }}
            />
          </div>
          <span className="w-12 font-mono text-right" style={{ color: s.flagged ? "#ef4444" : "#94a3b8" }}>
            χ²={s.dsfStat.toFixed(1)}
          </span>
          <span className="w-14 font-mono text-right text-slate-500">{s.flagged ? "⚠" : "✓"}</span>
        </div>
      ))}
    </div>
  );
}

function DeltaHeatmap({ items }: { items: DSFItem[] }) {
  const maxSteps = Math.max(2, ...items.map((d) => d.steps.length));
  const maxStat = Math.max(3.84, ...items.flatMap((d) => d.steps.map((s) => s.dsfStat)));
  const show = items.slice(0, 30);

  function heatColor(stat: number): string {
    const t = Math.min(1, stat / maxStat);
    if (t > 0.7) return `rgba(239,68,68,${0.4 + t * 0.6})`;
    if (t > 0.4) return `rgba(245,158,11,${0.3 + t * 0.5})`;
    return `rgba(99,102,241,${0.1 + t * 0.4})`;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-slate-300">
        <thead>
          <tr className="bg-slate-800/80 text-slate-400">
            <th className="px-2 py-2 text-left sticky left-0 bg-slate-800/80 z-10">Item</th>
            {Array.from({ length: maxSteps }, (_, i) => (
              <th key={i} className="px-2 py-2 text-center">Step {i + 1}</th>
            ))}
            <th className="px-2 py-2 text-center">Max χ²</th>
          </tr>
        </thead>
        <tbody>
          {show.map((d) => (
            <tr key={d.itemId} className={`border-t border-slate-700/30 ${d.flagged ? "bg-red-950/20" : ""}`}>
              <td className="px-2 py-1.5 font-mono sticky left-0 bg-slate-800/60">{d.itemLabel}</td>
              {Array.from({ length: maxSteps }, (_, i) => {
                const step = d.steps[i];
                return (
                  <td key={i} className="px-2 py-1.5 text-center font-mono" style={{ background: step ? heatColor(step.dsfStat) : undefined }}>
                    {step ? step.dsfStat.toFixed(1) : "—"}
                  </td>
                );
              })}
              <td className="px-2 py-1.5 text-center font-mono" style={{ color: d.flagged ? "#ef4444" : "#94a3b8" }}>
                {d.maxDSFStat.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

type DSFTab = "overview" | "heatmap" | "items" | "dist";
type SortKey = "maxDSFStat" | "nFlaggedSteps" | "nFocal" | "nCategories";

export function DifferentialStepFunctioningPanel() {
  const [data, setData] = useState<DSFPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DSFTab>("overview");
  const [sortKey, setSortKey] = useState<SortKey>("maxDSFStat");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch("/api/psychometrics/dsf-analysis");
      if (!r.ok) throw new Error(await r.text());
      setData(await r.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const kpis = data ? [
    { label: "Items Analysed", value: data.totalItems, icon: <Layers size={16} />, color: "#6366f1", fmt: String },
    { label: "Flagged Items", value: data.flaggedItems, icon: <AlertTriangle size={16} />, color: data.flaggedItems > 0 ? "#ef4444" : "#10b981", fmt: String },
    { label: "Flagged Steps", value: data.totalFlaggedSteps, icon: <BarChart3 size={16} />, color: data.totalFlaggedSteps > 0 ? "#f59e0b" : "#10b981", fmt: String },
    { label: "Group Method", value: data.groupingMethod, icon: <CheckCircle2 size={16} />, color: "#8b5cf6", fmt: (v: string) => v },
  ] : [];

  const sorted = data
    ? [...data.items]
        .filter((d) => !flaggedOnly || d.flagged)
        .sort((a, b) => {
          if (sortKey === "maxDSFStat") return b.maxDSFStat - a.maxDSFStat;
          if (sortKey === "nFlaggedSteps") return b.nFlaggedSteps - a.nFlaggedSteps;
          if (sortKey === "nFocal") return b.nFocal - a.nFocal;
          return b.nCategories - a.nCategories;
        })
    : [];

  const TABS: { id: DSFTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "heatmap", label: "Heatmap" },
    { id: "items", label: "Item Detail" },
    { id: "dist", label: "Distribution" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Differential Step Functioning</h2>
          <p className="text-slate-400 text-sm mt-1">
            DSF analysis for polytomous items · Donoghue &amp; Allen (1993) MH-based step statistics
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">{error}</div>}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2" style={{ color: k.color }}>{k.icon}<span className="text-xs text-slate-400">{k.label}</span></div>
            <div className="text-2xl font-bold text-white">{(k.fmt as (v: any) => string | number)(k.value as any)}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/40 rounded-lg p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === t.id ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* OVERVIEW */}
        {activeTab === "overview" && (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <p className="text-slate-400 text-xs leading-relaxed">
              DSF examines whether each transition between adjacent score categories (steps) behaves
              differently for focal vs. reference groups. A chi-square ≥ 3.84 (α = 0.05) flags a step.
              Groups split by theta-median proxy (theta ≥ median = reference; theta &lt; median = focal).
            </p>
            {loading ? (
              <div className="text-center py-12 text-slate-400"><RefreshCw size={24} className="animate-spin mx-auto mb-3" />Loading…</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data?.categoryDistribution.map((c) => (
                  <div key={c.nCats} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
                    <div className="text-sm font-medium text-white">{c.nCats} Categories</div>
                    <div className="text-2xl font-bold text-indigo-400 mt-1">{c.count}</div>
                    <div className="text-xs text-slate-500">items</div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* HEATMAP */}
        {activeTab === "heatmap" && (
          <motion.div key="heatmap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <p className="text-slate-400 text-xs">
              DSF χ² per step per item (top 30 by max χ²). Red = flagged step (χ² ≥ 3.84).
            </p>
            {data && <DeltaHeatmap items={[...data.items].sort((a, b) => b.maxDSFStat - a.maxDSFStat)} />}
          </motion.div>
        )}

        {/* ITEM DETAIL */}
        {activeTab === "items" && (
          <motion.div key="items" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} className="accent-indigo-500" />
                Flagged only
              </label>
              <select
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
              >
                <option value="maxDSFStat">Sort: Max χ²</option>
                <option value="nFlaggedSteps">Sort: Flagged steps</option>
                <option value="nFocal">Sort: N focal</option>
                <option value="nCategories">Sort: Categories</option>
              </select>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-400"><RefreshCw size={24} className="animate-spin mx-auto mb-3" />Loading…</div>
            ) : sorted.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No items match the current filter.</div>
            ) : (
              <div className="space-y-2">
                {sorted.map((d) => (
                  <div key={d.itemId} className={`bg-slate-800/60 rounded-xl border ${d.flagged ? "border-red-700/50" : "border-slate-700/50"} overflow-hidden`}>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-700/30 transition-colors"
                      onClick={() => setExpandedItem(expandedItem === d.itemId ? null : d.itemId)}
                    >
                      <span
                        className="px-1.5 py-0.5 rounded text-xs font-medium text-white shrink-0"
                        style={{ background: SKILL_COLORS[d.skill] ?? "#6366f1" }}
                      >
                        {d.skill.slice(0, 3)}
                      </span>
                      <span className="font-mono text-sm text-white flex-1">{d.itemLabel}</span>
                      <span className="text-xs text-slate-400">{d.nCategories} cats</span>
                      <span className="text-xs text-slate-400">{d.nFlaggedSteps}/{d.steps.length} steps flagged</span>
                      <span className="text-xs font-mono" style={{ color: d.flagged ? "#ef4444" : "#94a3b8" }}>
                        max χ²={d.maxDSFStat.toFixed(1)}
                      </span>
                      {d.flagged
                        ? <AlertTriangle size={14} className="text-red-400 shrink-0" />
                        : <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                      }
                    </button>
                    {expandedItem === d.itemId && (
                      <div className="px-4 pb-4">
                        <StepProfile steps={d.steps} />
                        <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-slate-400">
                          <div>N Focal: <span className="text-white">{d.nFocal}</span></div>
                          <div>N Reference: <span className="text-white">{d.nReference}</span></div>
                          <div>CEFR: <span className="text-white">{d.cefrLevel}</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* DISTRIBUTION */}
        {activeTab === "dist" && (
          <motion.div key="dist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <p className="text-slate-400 text-xs">
              Distribution of maximum DSF χ² statistics across all analysed items. Critical value (α=0.05) = 3.84.
            </p>
            {data && (() => {
              const max = Math.max(1, ...data.dsfStatDistribution.map((b) => b.count));
              return (
                <div className="space-y-1">
                  {data.dsfStatDistribution.map((b) => {
                    const flagged = parseFloat(b.bin) >= 3.84;
                    return (
                      <div key={b.bin} className="flex items-center gap-2 text-xs">
                        <span className="w-10 text-right font-mono text-slate-400">{b.bin}</span>
                        <div className="flex-1 bg-slate-800 rounded-full h-4 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${(b.count / max) * 100}%`, background: flagged ? "#ef4444" : "#6366f1" }}
                          />
                        </div>
                        <span className="w-8 text-slate-300">{b.count}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
