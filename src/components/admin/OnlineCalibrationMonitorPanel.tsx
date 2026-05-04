import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, TrendingUp, CheckCircle2, AlertTriangle, Activity } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ItemDriftRecord {
  itemId: string;
  itemLabel: string;
  skill: string;
  cefrLevel: string;
  difficultyBaseline: number;
  difficultyRecent: number;
  driftDelta: number;
  discriminationBaseline: number;
  discriminationRecent: number;
  discDelta: number;
  cusumUp: number;
  cusumDown: number;
  nBaseline: number;
  nRecent: number;
  driftFlag: boolean;
  cusumFlag: boolean;
  flagged: boolean;
}

interface EpochPoint {
  epoch: string;
  meanDifficulty: number;
  meanDiscrimination: number;
  nItems: number;
}

interface OnlineCalibPayload {
  totalItems: number;
  flaggedItems: number;
  meanDrift: number;
  maxAbsDrift: number;
  items: ItemDriftRecord[];
  epochTrend: EpochPoint[];
  driftDistribution: { bin: string; count: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SKILL_COLORS: Record<string, string> = {
  GRAMMAR: "#6366f1", VOCABULARY: "#8b5cf6", READING: "#3b82f6",
  LISTENING: "#06b6d4", WRITING: "#10b981", SPEAKING: "#f59e0b",
};

function DriftBar({ value }: { value: number }) {
  const clamped = Math.max(-2, Math.min(2, value));
  const pct = ((clamped + 2) / 4) * 100;
  const color = Math.abs(value) > 0.3 ? "#ef4444" : Math.abs(value) > 0.15 ? "#f59e0b" : "#10b981";
  return (
    <div className="relative w-20 h-2 bg-slate-800 rounded-full">
      <div className="absolute w-0.5 h-2 bg-white/20" style={{ left: "50%" }} />
      <div className="absolute top-0 h-2 w-2 rounded-full -translate-x-1/2" style={{ left: `${pct}%`, background: color }} />
    </div>
  );
}

function CusumChart({ items }: { items: ItemDriftRecord[] }) {
  const maxV = Math.max(1, ...items.map((d) => Math.max(d.cusumUp, Math.abs(d.cusumDown))));
  const W = 380, H = 120, PAD = 28;
  const xs = (i: number) => PAD + (i / Math.max(1, items.length - 1)) * (W - PAD * 2);
  const ys = (v: number) => PAD + ((maxV - v) / (maxV * 2)) * (H - PAD * 2);
  const threshold = maxV * 0.6;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 120 }}>
      {/* zero line */}
      <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke="#334155" strokeWidth={1} />
      {/* threshold lines */}
      <line x1={PAD} y1={ys(threshold)} x2={W - PAD} y2={ys(threshold)} stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 3" />
      <line x1={PAD} y1={ys(-threshold)} x2={W - PAD} y2={ys(-threshold)} stroke="#f59e0b" strokeWidth={1} strokeDasharray="4 3" />
      {/* CUSUM Up */}
      {items.length > 1 && (
        <polyline
          fill="none"
          stroke="#6366f1"
          strokeWidth={1.5}
          points={items.map((d, i) => `${xs(i)},${ys(d.cusumUp)}`).join(" ")}
        />
      )}
      {/* CUSUM Down */}
      {items.length > 1 && (
        <polyline
          fill="none"
          stroke="#ef4444"
          strokeWidth={1.5}
          points={items.map((d, i) => `${xs(i)},${ys(d.cusumDown)}`).join(" ")}
        />
      )}
      {/* dots for flagged */}
      {items.map((d, i) =>
        d.cusumFlag ? (
          <circle key={d.itemId} cx={xs(i)} cy={ys(d.cusumUp)} r={3} fill="#f59e0b" />
        ) : null
      )}
      <text x={PAD} y={H - 4} fontSize={9} fill="#64748b">Items by drift magnitude</text>
    </svg>
  );
}

function EpochTrendChart({ data }: { data: EpochPoint[] }) {
  if (data.length < 2) return <div className="text-slate-500 text-xs text-center py-8">Not enough epoch data</div>;
  const W = 380, H = 120, PAD = 32;
  const diffs = data.map((d) => d.meanDifficulty);
  const minD = Math.min(...diffs) - 0.1;
  const maxD = Math.max(...diffs) + 0.1;
  const xs = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const ys = (v: number) => PAD + ((maxD - v) / (maxD - minD)) * (H - PAD * 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 120 }}>
      <polyline
        fill="none"
        stroke="#6366f1"
        strokeWidth={2}
        points={data.map((d, i) => `${xs(i)},${ys(d.meanDifficulty)}`).join(" ")}
      />
      {data.map((d, i) => (
        <circle key={i} cx={xs(i)} cy={ys(d.meanDifficulty)} r={3} fill="#6366f1">
          <title>{`${d.epoch}: b̄=${d.meanDifficulty.toFixed(2)}`}</title>
        </circle>
      ))}
      {data.map((d, i) => (
        i % Math.max(1, Math.floor(data.length / 5)) === 0 ? (
          <text key={`lbl-${i}`} x={xs(i)} y={H - 4} fontSize={8} fill="#64748b" textAnchor="middle">
            {d.epoch}
          </text>
        ) : null
      ))}
      <text x={4} y={PAD} fontSize={8} fill="#6366f1">b̄</text>
    </svg>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

type SortKey = "driftDelta" | "cusumUp" | "discDelta" | "nRecent";

export function OnlineCalibrationMonitorPanel() {
  const [data, setData] = useState<OnlineCalibPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"table" | "cusum" | "trend" | "dist">("table");
  const [sortKey, setSortKey] = useState<SortKey>("driftDelta");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch("/api/psychometrics/online-calibration");
      if (!r.ok) throw new Error(await r.text());
      setData(await r.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const kpis = data ? [
    { label: "Items Monitored", value: data.totalItems, icon: <Activity size={16} />, color: "#6366f1", fmt: String },
    { label: "Drift Flagged", value: data.flaggedItems, icon: <AlertTriangle size={16} />, color: data.flaggedItems > 0 ? "#ef4444" : "#10b981", fmt: String },
    { label: "Mean |Δb|", value: data.meanDrift, icon: <TrendingUp size={16} />, color: Math.abs(data.meanDrift) > 0.15 ? "#f59e0b" : "#10b981", fmt: (v: number) => v.toFixed(3) },
    { label: "Max |Δb|", value: data.maxAbsDrift, icon: <CheckCircle2 size={16} />, color: data.maxAbsDrift > 0.3 ? "#ef4444" : "#10b981", fmt: (v: number) => v.toFixed(3) },
  ] : [];

  const sorted = data
    ? [...data.items]
        .filter((d) => !flaggedOnly || d.flagged)
        .filter((d) => !search || d.itemLabel.toLowerCase().includes(search.toLowerCase()) || d.skill.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => {
          if (sortKey === "driftDelta") return Math.abs(b.driftDelta) - Math.abs(a.driftDelta);
          if (sortKey === "cusumUp") return b.cusumUp - a.cusumUp;
          if (sortKey === "discDelta") return Math.abs(b.discDelta) - Math.abs(a.discDelta);
          return b.nRecent - a.nRecent;
        })
    : [];

  const TABS = [
    { id: "table" as const, label: "Drift Table" },
    { id: "cusum" as const, label: "CUSUM Chart" },
    { id: "trend" as const, label: "Epoch Trend" },
    { id: "dist" as const, label: "Distribution" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Online Calibration Monitor</h2>
          <p className="text-slate-400 text-sm mt-1">
            CUSUM-based parameter drift detection · Holland & Wainer (1993) framework
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
            <div className="text-2xl font-bold text-white">{k.fmt(k.value as any)}</div>
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
        {/* TABLE */}
        {activeTab === "table" && (
          <motion.div key="table" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <input
                className="flex-1 min-w-[160px] bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                placeholder="Search item / skill…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} className="accent-indigo-500" />
                Flagged only
              </label>
              <select
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
              >
                <option value="driftDelta">Sort: |Δb|</option>
                <option value="cusumUp">Sort: CUSUM+</option>
                <option value="discDelta">Sort: |Δa|</option>
                <option value="nRecent">Sort: N recent</option>
              </select>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-400"><RefreshCw size={24} className="animate-spin mx-auto mb-3" />Loading…</div>
            ) : sorted.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No items match the current filter.</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-700/50">
                <table className="w-full text-xs text-slate-300">
                  <thead>
                    <tr className="bg-slate-800/80 text-slate-400">
                      <th className="px-3 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-left">Skill</th>
                      <th className="px-3 py-2 text-right">b Base</th>
                      <th className="px-3 py-2 text-right">b Recent</th>
                      <th className="px-3 py-2 text-center">Δb</th>
                      <th className="px-3 py-2 text-right">a Base</th>
                      <th className="px-3 py-2 text-right">a Recent</th>
                      <th className="px-3 py-2 text-right">CUSUM+</th>
                      <th className="px-3 py-2 text-right">N Recent</th>
                      <th className="px-3 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((d) => (
                      <tr key={d.itemId} className={`border-t border-slate-700/30 hover:bg-slate-800/40 ${d.flagged ? "bg-red-950/20" : ""}`}>
                        <td className="px-3 py-2 font-mono text-white">{d.itemLabel}</td>
                        <td className="px-3 py-2">
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium text-white" style={{ background: SKILL_COLORS[d.skill] ?? "#6366f1" }}>
                            {d.skill.slice(0, 3)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{d.difficultyBaseline.toFixed(3)}</td>
                        <td className="px-3 py-2 text-right font-mono">{d.difficultyRecent.toFixed(3)}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center justify-center gap-1">
                            <DriftBar value={d.driftDelta} />
                            <span className="font-mono w-14 text-right" style={{ color: Math.abs(d.driftDelta) > 0.3 ? "#ef4444" : Math.abs(d.driftDelta) > 0.15 ? "#f59e0b" : "#10b981" }}>
                              {d.driftDelta >= 0 ? "+" : ""}{d.driftDelta.toFixed(3)}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{d.discriminationBaseline.toFixed(3)}</td>
                        <td className="px-3 py-2 text-right font-mono">{d.discriminationRecent.toFixed(3)}</td>
                        <td className="px-3 py-2 text-right font-mono">{d.cusumUp.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right">{d.nRecent}</td>
                        <td className="px-3 py-2 text-center">
                          {d.flagged
                            ? <span className="px-1.5 py-0.5 rounded bg-red-900/50 text-red-300 text-xs">⚠ Drift</span>
                            : <span className="px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-300 text-xs">✓ Stable</span>
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

        {/* CUSUM */}
        {activeTab === "cusum" && (
          <motion.div key="cusum" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <p className="text-slate-400 text-xs">
              CUSUM+ (indigo) and CUSUM− (red) for each item sorted by |Δb|. Amber dashes = alert threshold.
            </p>
            {data && <CusumChart items={[...data.items].sort((a, b) => Math.abs(b.driftDelta) - Math.abs(a.driftDelta)).slice(0, 60)} />}
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-indigo-500 inline-block" />CUSUM+</span>
              <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-red-500 inline-block" />CUSUM−</span>
              <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-amber-500 inline-block border-dashed" />Alert threshold</span>
            </div>
          </motion.div>
        )}

        {/* EPOCH TREND */}
        {activeTab === "trend" && (
          <motion.div key="trend" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <p className="text-slate-400 text-xs">
              Mean difficulty (b̄) across items over calibration epochs. Upward/downward trend indicates systematic drift.
            </p>
            {data && <EpochTrendChart data={data.epochTrend} />}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
              {data?.epochTrend.map((ep) => (
                <div key={ep.epoch} className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
                  <div className="text-xs text-slate-400">{ep.epoch}</div>
                  <div className="text-sm font-mono text-white mt-1">b̄ = {ep.meanDifficulty.toFixed(3)}</div>
                  <div className="text-xs text-slate-500">ā = {ep.meanDiscrimination.toFixed(3)} · N = {ep.nItems}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* DISTRIBUTION */}
        {activeTab === "dist" && (
          <motion.div key="dist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <p className="text-slate-400 text-xs">Distribution of difficulty drift (Δb = b_recent − b_baseline) across all monitored items.</p>
            {data && (() => {
              const max = Math.max(1, ...data.driftDistribution.map((b) => b.count));
              return (
                <div className="space-y-1">
                  {data.driftDistribution.map((b) => {
                    const flagged = Math.abs(parseFloat(b.bin)) > 0.3;
                    return (
                      <div key={b.bin} className="flex items-center gap-2 text-xs">
                        <span className="w-14 text-right font-mono text-slate-400">{b.bin}</span>
                        <div className="flex-1 bg-slate-800 rounded-full h-4 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
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
