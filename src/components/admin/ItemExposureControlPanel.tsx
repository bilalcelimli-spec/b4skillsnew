import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, Shield, AlertTriangle, CheckCircle2, BarChart3 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ItemExposureStats {
  itemId: string;
  itemLabel: string;
  skill: string;
  cefrLevel: string;
  difficulty: number;
  discrimination: number;
  nExposures: number;
  exposureRate: number;    // r_j = exposures / totalSessions
  maxExposureRate: number; // Sympson-Hetter r_max (configurable, default 0.30)
  ksControlRate: number;   // Stocking(1993) target: r_max * sqrt(discrimination)
  overexposed: boolean;    // exposureRate > maxExposureRate
  underexposed: boolean;   // exposureRate < 0.02 (never used)
  pCorr: number;           // p-correct across all administrations
}

interface ExposureSummary {
  totalItems: number;
  totalSessions: number;
  overexposedItems: number;
  underexposedItems: number;
  meanExposureRate: number;
  overexposureRate: number;   // pct items overexposed
  maxRateSetting: number;
  items: ItemExposureStats[];
  rateDistribution: { bin: string; count: number }[];
  skillSummary: { skill: string; nItems: number; meanRate: number; overexposed: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SKILL_COLORS: Record<string, string> = {
  GRAMMAR: "#6366f1", VOCABULARY: "#8b5cf6", READING: "#3b82f6",
  LISTENING: "#06b6d4", WRITING: "#10b981", SPEAKING: "#f59e0b",
};

const RATE_THRESHOLDS = [0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40, 0.50, 1.0];

function ExposureBar({ rate, max }: { rate: number; max: number }) {
  const pct = Math.min(100, (rate / Math.max(0.01, max * 1.5)) * 100);
  const overPct = Math.min(100, (max / Math.max(0.01, max * 1.5)) * 100);
  const color = rate > max ? "#ef4444" : rate > max * 0.8 ? "#f59e0b" : "#10b981";
  return (
    <div className="relative w-full h-2 bg-slate-800 rounded-full overflow-visible">
      {/* max line */}
      <div className="absolute top-0 h-full w-0.5 bg-white/30 z-10" style={{ left: `${overPct}%` }} />
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function RateDistChart({ bins }: { bins: { bin: string; count: number }[] }) {
  const max = Math.max(1, ...bins.map((b) => b.count));
  return (
    <div className="space-y-1">
      {bins.map((b) => {
        const r = parseFloat(b.bin);
        const over = r >= 0.30;
        const warn = r >= 0.20;
        return (
          <div key={b.bin} className="flex items-center gap-2 text-xs">
            <span className="w-12 text-right font-mono text-slate-400">{b.bin}</span>
            <div className="flex-1 bg-slate-800 rounded-full h-4 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${(b.count / max) * 100}%`, background: over ? "#ef4444" : warn ? "#f59e0b" : "#6366f1" }}
              />
            </div>
            <span className="w-8 text-slate-300">{b.count}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

type ExpTab = "items" | "skill" | "dist" | "policy";
type SortKey = "exposureRate" | "nExposures" | "discrimination" | "pCorr";

export function ItemExposureControlPanel() {
  const [data, setData] = useState<ExposureSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ExpTab>("items");
  const [sortKey, setSortKey] = useState<SortKey>("exposureRate");
  const [filterMode, setFilterMode] = useState<"all" | "over" | "under">("all");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch("/api/psychometrics/exposure-control");
      if (!r.ok) throw new Error(await r.text());
      setData(await r.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const kpis = data ? [
    { label: "Items", value: data.totalItems, icon: <Shield size={16} />, color: "#6366f1", fmt: String },
    { label: "Overexposed", value: data.overexposedItems, icon: <AlertTriangle size={16} />, color: data.overexposedItems > 0 ? "#ef4444" : "#10b981", fmt: String },
    { label: "Underexposed", value: data.underexposedItems, icon: <BarChart3 size={16} />, color: data.underexposedItems > 0 ? "#f59e0b" : "#10b981", fmt: String },
    { label: "Mean Rate", value: data.meanExposureRate, icon: <CheckCircle2 size={16} />, color: data.meanExposureRate > 0.3 ? "#ef4444" : "#10b981", fmt: (v: number) => v.toFixed(3) },
  ] : [];

  const filteredItems = data
    ? [...data.items]
        .filter((d) => {
          if (filterMode === "over") return d.overexposed;
          if (filterMode === "under") return d.underexposed;
          return true;
        })
        .sort((a, b) => {
          if (sortKey === "exposureRate") return b.exposureRate - a.exposureRate;
          if (sortKey === "nExposures") return b.nExposures - a.nExposures;
          if (sortKey === "discrimination") return b.discrimination - a.discrimination;
          return a.pCorr - b.pCorr;
        })
    : [];

  const TABS: { id: ExpTab; label: string }[] = [
    { id: "items", label: "Item Table" },
    { id: "skill", label: "By Skill" },
    { id: "dist", label: "Rate Distribution" },
    { id: "policy", label: "Control Policy" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Item Exposure Control</h2>
          <p className="text-slate-400 text-sm mt-1">
            Sympson–Hetter (1991) exposure control · r_max = 0.30 · flags overexposed items
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
            <div className="text-2xl font-bold text-white">{(k.fmt as (v: any) => string)(k.value as any)}</div>
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
        {/* ITEM TABLE */}
        {activeTab === "items" && (
          <motion.div key="items" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-1">
                {(["all", "over", "under"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setFilterMode(m)}
                    className={`px-2 py-1 rounded text-xs transition-colors ${filterMode === m ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
                  >
                    {m === "all" ? "All" : m === "over" ? "Overexposed" : "Underexposed"}
                  </button>
                ))}
              </div>
              <select
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
              >
                <option value="exposureRate">Sort: Exposure Rate (desc)</option>
                <option value="nExposures">Sort: # Exposures (desc)</option>
                <option value="discrimination">Sort: Discrimination (desc)</option>
                <option value="pCorr">Sort: p-correct (asc)</option>
              </select>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-400"><RefreshCw size={24} className="animate-spin mx-auto mb-3" />Loading…</div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No items match the current filter.</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-700/50">
                <table className="w-full text-xs text-slate-300">
                  <thead>
                    <tr className="bg-slate-800/80 text-slate-400">
                      <th className="px-3 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-left">Skill</th>
                      <th className="px-3 py-2 text-right">CEFR</th>
                      <th className="px-3 py-2 text-right">N</th>
                      <th className="px-3 py-2 text-right min-w-[140px]">Exposure Rate</th>
                      <th className="px-3 py-2 text-right">p-corr</th>
                      <th className="px-3 py-2 text-right">a</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((d) => (
                      <tr key={d.itemId} className={`border-t border-slate-700/30 hover:bg-slate-800/40 ${d.overexposed ? "bg-red-950/20" : ""}`}>
                        <td className="px-3 py-2 font-mono text-white">{d.itemLabel}</td>
                        <td className="px-3 py-2">
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium text-white" style={{ background: SKILL_COLORS[d.skill] ?? "#6366f1" }}>
                            {d.skill.slice(0, 3)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">{d.cefrLevel}</td>
                        <td className="px-3 py-2 text-right">{d.nExposures}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <ExposureBar rate={d.exposureRate} max={d.maxExposureRate} />
                            <span className="w-12 text-right font-mono" style={{ color: d.overexposed ? "#ef4444" : d.exposureRate > d.maxExposureRate * 0.8 ? "#f59e0b" : "#10b981" }}>
                              {d.exposureRate.toFixed(3)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{d.pCorr.toFixed(3)}</td>
                        <td className="px-3 py-2 text-right font-mono">{d.discrimination.toFixed(2)}</td>
                        <td className="px-3 py-2 text-center">
                          {d.overexposed
                            ? <span className="px-1.5 py-0.5 rounded bg-red-900/50 text-red-300 text-xs">Over</span>
                            : d.underexposed
                            ? <span className="px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300 text-xs">Under</span>
                            : <span className="px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-300 text-xs">OK</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* SKILL SUMMARY */}
        {activeTab === "skill" && (
          <motion.div key="skill" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <p className="text-slate-400 text-xs leading-relaxed">
              Per-skill exposure summary. High mean rates in specific skills may indicate over-reliance on a narrow item subset.
            </p>
            {data && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.skillSummary.map((s, i) => (
                  <div key={s.skill} className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-3 h-3 rounded-full" style={{ background: SKILL_COLORS[s.skill] ?? "#6366f1" }} />
                      <span className="text-sm font-medium text-white">{s.skill}</span>
                      {s.overexposed > 0 && (
                        <span className="ml-auto px-1.5 py-0.5 rounded bg-red-900/50 text-red-300 text-xs">
                          {s.overexposed} over
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div><div className="text-slate-500">Items</div><div className="text-white font-bold">{s.nItems}</div></div>
                      <div><div className="text-slate-500">Mean Rate</div>
                        <div className="font-mono font-bold" style={{ color: s.meanRate > 0.3 ? "#ef4444" : s.meanRate > 0.2 ? "#f59e0b" : "#10b981" }}>
                          {s.meanRate.toFixed(3)}
                        </div>
                      </div>
                    </div>
                    <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (s.meanRate / 0.4) * 100)}%`,
                          background: SKILL_COLORS[s.skill] ?? "#6366f1",
                        }}
                      />
                      <div className="absolute top-0 h-full w-0.5 bg-white/30" style={{ left: `${(0.3 / 0.4) * 100}%` }} />
                    </div>
                    <div className="text-xs text-slate-500 mt-1">r_max = 0.30 (white line)</div>
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
              Distribution of item exposure rates across all active items.
              Items with rate &gt; 0.30 (red) violate the Sympson–Hetter constraint and should have control parameters tightened.
            </p>
            {data && <RateDistChart bins={data.rateDistribution} />}
          </motion.div>
        )}

        {/* POLICY */}
        {activeTab === "policy" && (
          <motion.div key="policy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <p className="text-slate-400 text-xs leading-relaxed">
              The Sympson–Hetter (1991) method computes a conditional probability K_j such that P(item j selected) × K_j ≤ r_max.
              The platform uses r_max = 0.30 by default. Items exceeding this threshold should be reviewed for content over-reliance.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 space-y-2 text-xs">
                <div className="text-slate-300 font-medium mb-2">Sympson–Hetter Algorithm</div>
                <div className="text-slate-400">r_j = nExposures_j / nSessions</div>
                <div className="text-slate-400">K_j = r_max / P(item j selected by CAT)</div>
                <div className="text-slate-400">Administer j iff U(0,1) ≤ K_j</div>
                <div className="text-slate-400">Iterate until convergence of K_j</div>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 space-y-2 text-xs">
                <div className="text-slate-300 font-medium mb-2">Platform Settings</div>
                <div className="flex justify-between"><span className="text-slate-400">Max exposure rate (r_max)</span><span className="text-white font-mono">0.30</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Underexposure threshold</span><span className="text-white font-mono">0.02</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Min responses for estimate</span><span className="text-white font-mono">20</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Total sessions (observed)</span><span className="text-white font-mono">{data?.totalSessions ?? "—"}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Items violating r_max</span>
                  <span className="font-mono" style={{ color: (data?.overexposedItems ?? 0) > 0 ? "#ef4444" : "#10b981" }}>
                    {data?.overexposedItems ?? "—"}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
