import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, Share2, CheckCircle2, AlertTriangle, BarChart3 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GroupParam {
  groupLabel: string;
  nItems: number;
  nResponses: number;
  meanDifficulty: number;
  sdDifficulty: number;
  meanDiscrimination: number;
  sdDiscrimination: number;
}

interface InvarianceItem {
  itemId: string;
  itemLabel: string;
  skill: string;
  cefrLevel: string;
  groups: {
    groupLabel: string;
    estimatedB: number;
    estimatedA: number;
    nResponses: number;
  }[];
  maxDeltaB: number;    // max |b_i - b_j| across group pairs
  maxDeltaA: number;
  chiSqB: number;       // Wald-like statistic for b
  pValueB: number;
  flagged: boolean;
}

interface InvariancePayload {
  groupingDimension: string;
  totalItems: number;
  flaggedItems: number;
  groups: GroupParam[];
  items: InvarianceItem[];
  deltaDistribution: { bin: string; count: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SKILL_COLORS: Record<string, string> = {
  GRAMMAR: "#6366f1", VOCABULARY: "#8b5cf6", READING: "#3b82f6",
  LISTENING: "#06b6d4", WRITING: "#10b981", SPEAKING: "#f59e0b",
};

const GROUP_COLORS = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ec4899", "#ef4444"];

function DeltaProfile({ item, groups }: { item: InvarianceItem; groups: GroupParam[] }) {
  const allB = item.groups.map((g) => g.estimatedB);
  const minB = Math.min(...allB), maxB = Math.max(...allB);
  const rangeB = Math.max(0.1, maxB - minB);

  return (
    <div className="space-y-1 pt-2">
      {item.groups.map((g, i) => {
        const pct = ((g.estimatedB - minB) / rangeB) * 80 + 10;
        return (
          <div key={g.groupLabel} className="flex items-center gap-2 text-xs">
            <span className="w-24 truncate text-slate-400">{g.groupLabel}</span>
            <div className="flex-1 relative h-2 bg-slate-700 rounded-full">
              <div
                className="absolute top-0 h-2 w-2 rounded-full -translate-x-1/2"
                style={{ left: `${pct}%`, background: GROUP_COLORS[i % GROUP_COLORS.length] }}
              />
            </div>
            <span className="w-14 text-right font-mono" style={{ color: GROUP_COLORS[i % GROUP_COLORS.length] }}>
              {g.estimatedB.toFixed(3)}
            </span>
            <span className="w-10 text-right text-slate-500">N={g.nResponses}</span>
          </div>
        );
      })}
    </div>
  );
}

function GroupRadarBars({ groups }: { groups: GroupParam[] }) {
  const maxMeanB = Math.max(...groups.map((g) => Math.abs(g.meanDifficulty))) || 1;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {groups.map((g, i) => (
        <div key={g.groupLabel} className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-3 h-3 rounded-full" style={{ background: GROUP_COLORS[i % GROUP_COLORS.length] }} />
            <span className="text-sm font-medium text-white">{g.groupLabel}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-slate-500">Items</div>
              <div className="text-white font-bold">{g.nItems}</div>
            </div>
            <div>
              <div className="text-slate-500">Responses</div>
              <div className="text-white font-bold">{g.nResponses}</div>
            </div>
            <div>
              <div className="text-slate-500">Mean b (SD)</div>
              <div className="text-white font-mono">{g.meanDifficulty.toFixed(3)} ± {g.sdDifficulty.toFixed(3)}</div>
            </div>
            <div>
              <div className="text-slate-500">Mean a (SD)</div>
              <div className="text-white font-mono">{g.meanDiscrimination.toFixed(3)} ± {g.sdDiscrimination.toFixed(3)}</div>
            </div>
          </div>
          {/* Mean-b bar */}
          <div className="mt-3">
            <div className="text-xs text-slate-500 mb-1">Mean difficulty (b)</div>
            <div className="relative h-2 bg-slate-700 rounded-full w-full">
              <div className="absolute w-0.5 h-2 bg-white/20" style={{ left: "50%" }} />
              <div
                className="absolute top-0 h-2 w-2 rounded-full -translate-x-1/2"
                style={{
                  left: `${50 + (g.meanDifficulty / (maxMeanB * 2)) * 100}%`,
                  background: GROUP_COLORS[i % GROUP_COLORS.length],
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

type InvTab = "groups" | "items" | "dist";
type SortKey = "maxDeltaB" | "chiSqB" | "maxDeltaA" | "pValueB";

export function MultigroupInvariancePanel() {
  const [data, setData] = useState<InvariancePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<InvTab>("groups");
  const [sortKey, setSortKey] = useState<SortKey>("maxDeltaB");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch("/api/psychometrics/mg-invariance");
      if (!r.ok) throw new Error(await r.text());
      setData(await r.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const kpis = data ? [
    { label: "Groups", value: data.groups.length, icon: <Share2 size={16} />, color: "#6366f1", fmt: String },
    { label: "Items Tested", value: data.totalItems, icon: <BarChart3 size={16} />, color: "#8b5cf6", fmt: String },
    { label: "Non-Invariant", value: data.flaggedItems, icon: <AlertTriangle size={16} />, color: data.flaggedItems > 0 ? "#ef4444" : "#10b981", fmt: String },
    { label: "Grouping By", value: data.groupingDimension, icon: <CheckCircle2 size={16} />, color: "#06b6d4", fmt: (v: string) => v },
  ] : [];

  const sortedItems = data
    ? [...data.items]
        .filter((d) => !flaggedOnly || d.flagged)
        .sort((a, b) => {
          if (sortKey === "maxDeltaB") return b.maxDeltaB - a.maxDeltaB;
          if (sortKey === "chiSqB") return b.chiSqB - a.chiSqB;
          if (sortKey === "maxDeltaA") return b.maxDeltaA - a.maxDeltaA;
          return a.pValueB - b.pValueB;
        })
    : [];

  const TABS: { id: InvTab; label: string }[] = [
    { id: "groups", label: "Group Summary" },
    { id: "items", label: "Item Invariance" },
    { id: "dist", label: "Δb Distribution" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Multigroup Measurement Invariance</h2>
          <p className="text-slate-400 text-sm mt-1">
            IRT parameter stability across skill groups · Millsap &amp; Kwok (2004) framework · |Δb| &gt; 0.5 flagged
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
        {/* GROUPS */}
        {activeTab === "groups" && (
          <motion.div key="groups" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <p className="text-slate-400 text-xs leading-relaxed">
              Item parameter estimates (b = difficulty, a = discrimination) recomputed within each skill group.
              Systematic differences suggest measurement non-invariance — scores may not be directly comparable across groups.
            </p>
            {loading ? (
              <div className="text-center py-12 text-slate-400"><RefreshCw size={24} className="animate-spin mx-auto mb-3" />Loading…</div>
            ) : data ? (
              <GroupRadarBars groups={data.groups} />
            ) : null}
          </motion.div>
        )}

        {/* ITEMS */}
        {activeTab === "items" && (
          <motion.div key="items" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} className="accent-indigo-500" />
                Non-invariant only
              </label>
              <select
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
              >
                <option value="maxDeltaB">Sort: max |Δb|</option>
                <option value="chiSqB">Sort: χ²</option>
                <option value="maxDeltaA">Sort: max |Δa|</option>
                <option value="pValueB">Sort: p-value (asc)</option>
              </select>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-400"><RefreshCw size={24} className="animate-spin mx-auto mb-3" />Loading…</div>
            ) : sortedItems.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No items match the current filter.</div>
            ) : (
              <div className="space-y-2">
                {sortedItems.map((d) => (
                  <div key={d.itemId} className={`bg-slate-800/60 rounded-xl border ${d.flagged ? "border-red-700/50" : "border-slate-700/50"} overflow-hidden`}>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-700/30 transition-colors"
                      onClick={() => setExpandedItem(expandedItem === d.itemId ? null : d.itemId)}
                    >
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium text-white shrink-0" style={{ background: SKILL_COLORS[d.skill] ?? "#6366f1" }}>
                        {d.skill.slice(0, 3)}
                      </span>
                      <span className="font-mono text-sm text-white flex-1">{d.itemLabel}</span>
                      <span className="text-xs text-slate-400">{d.cefrLevel}</span>
                      <span className="text-xs font-mono" style={{ color: d.maxDeltaB > 0.5 ? "#ef4444" : d.maxDeltaB > 0.3 ? "#f59e0b" : "#94a3b8" }}>
                        max|Δb|={d.maxDeltaB.toFixed(3)}
                      </span>
                      <span className="text-xs font-mono text-slate-500">χ²={d.chiSqB.toFixed(2)}</span>
                      {d.flagged
                        ? <AlertTriangle size={14} className="text-red-400 shrink-0" />
                        : <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                      }
                    </button>
                    {expandedItem === d.itemId && (
                      <div className="px-4 pb-4">
                        <DeltaProfile item={d} groups={data?.groups ?? []} />
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-400">
                          <div>max|Δa|: <span className="text-white">{d.maxDeltaA.toFixed(3)}</span></div>
                          <div>χ²(b): <span className="text-white">{d.chiSqB.toFixed(3)}</span></div>
                          <div>p: <span className="text-white">{d.pValueB < 0.001 ? "<0.001" : d.pValueB.toFixed(3)}</span></div>
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
              Distribution of maximum |Δb| across item pairs. Values &gt; 0.5 (red) indicate practically significant non-invariance.
            </p>
            {data && (() => {
              const max = Math.max(1, ...data.deltaDistribution.map((b) => b.count));
              return (
                <div className="space-y-1">
                  {data.deltaDistribution.map((b) => {
                    const flagged = parseFloat(b.bin) >= 0.5;
                    const caution = parseFloat(b.bin) >= 0.3;
                    return (
                      <div key={b.bin} className="flex items-center gap-2 text-xs">
                        <span className="w-10 text-right font-mono text-slate-400">{b.bin}</span>
                        <div className="flex-1 bg-slate-800 rounded-full h-4 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${(b.count / max) * 100}%`, background: flagged ? "#ef4444" : caution ? "#f59e0b" : "#6366f1" }}
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
