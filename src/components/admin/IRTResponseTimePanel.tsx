import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, Clock, CheckCircle2, AlertTriangle, Activity } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RTItemStats {
  itemId: string;
  itemLabel: string;
  skill: string;
  cefrLevel: string;
  difficulty: number;
  discrimination: number;
  nResponses: number;
  meanLogRT: number;    // mean of log(latencyMs/1000) — log-normal location
  sdLogRT: number;      // sd of log(latencyMs/1000) — log-normal scale
  meanRT: number;       // arithmetic mean RT in seconds
  medianRT: number;
  rtThetaCorr: number;  // correlation between log-RT and theta (negative = fast-correct = OK; positive = speededness)
  rtAccCorr: number;    // point-biserial r(log-RT, isCorrect)
  speedFlag: boolean;   // rtThetaCorr > 0.3 → possible speededness
  slowFlag: boolean;    // meanRT > 120s
  flagged: boolean;
}

interface RTDistBin {
  bin: string;   // RT range in seconds
  count: number;
  pct: number;
}

interface PersonSpeedStats {
  theta: number;
  meanLogRT: number;
  nResponses: number;
}

interface IRTRTPayload {
  totalItems: number;
  totalResponses: number;
  flaggedItems: number;
  meanRTSeconds: number;
  items: RTItemStats[];
  rtDistribution: RTDistBin[];
  personSpeedSample: PersonSpeedStats[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SKILL_COLORS: Record<string, string> = {
  GRAMMAR: "#6366f1", VOCABULARY: "#8b5cf6", READING: "#3b82f6",
  LISTENING: "#06b6d4", WRITING: "#10b981", SPEAKING: "#f59e0b",
};

function RTBar({ meanRT, sdLogRT, flagged }: { meanRT: number; sdLogRT: number; flagged: boolean }) {
  const cap = 180;
  const w = Math.min(100, (meanRT / cap) * 100);
  const color = flagged ? "#ef4444" : meanRT > 60 ? "#f59e0b" : "#10b981";
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${w}%`, background: color }} />
      </div>
      <span className="w-16 text-right font-mono" style={{ color }}>{meanRT.toFixed(1)}s</span>
      <span className="w-16 text-right text-slate-500">σ={sdLogRT.toFixed(2)}</span>
    </div>
  );
}

function PersonSpeedScatter({ data }: { data: PersonSpeedStats[] }) {
  if (data.length < 5) return <div className="text-slate-500 text-xs text-center py-8">Not enough data</div>;
  const W = 380, H = 160, PAD = 32;
  const minTheta = Math.min(...data.map((d) => d.theta));
  const maxTheta = Math.max(...data.map((d) => d.theta));
  const minLRT = Math.min(...data.map((d) => d.meanLogRT));
  const maxLRT = Math.max(...data.map((d) => d.meanLogRT));
  const xs = (theta: number) => PAD + ((theta - minTheta) / Math.max(0.01, maxTheta - minTheta)) * (W - PAD * 2);
  const ys = (lrt: number) => PAD + ((maxLRT - lrt) / Math.max(0.01, maxLRT - minLRT)) * (H - PAD * 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 160 }}>
      {/* Axes */}
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#334155" strokeWidth={1} />
      <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#334155" strokeWidth={1} />
      {/* Dots */}
      {data.map((d, i) => (
        <circle
          key={i}
          cx={xs(d.theta)}
          cy={ys(d.meanLogRT)}
          r={2}
          fill="#6366f1"
          opacity={0.5}
        >
          <title>{`θ=${d.theta.toFixed(2)}, log-RT=${d.meanLogRT.toFixed(2)}`}</title>
        </circle>
      ))}
      <text x={W / 2} y={H - 4} fontSize={8} fill="#64748b" textAnchor="middle">θ (ability)</text>
      <text x={8} y={H / 2} fontSize={8} fill="#64748b" textAnchor="middle" transform={`rotate(-90, 8, ${H / 2})`}>log-RT</text>
    </svg>
  );
}

function RTDistChart({ bins }: { bins: RTDistBin[] }) {
  const max = Math.max(1, ...bins.map((b) => b.count));
  return (
    <div className="space-y-1">
      {bins.map((b) => {
        const slow = parseFloat(b.bin) >= 60;
        return (
          <div key={b.bin} className="flex items-center gap-2 text-xs">
            <span className="w-16 text-right font-mono text-slate-400">{b.bin}s</span>
            <div className="flex-1 bg-slate-800 rounded-full h-4 overflow-hidden">
              <div
                className="h-full rounded-full flex items-center px-1"
                style={{ width: `${(b.count / max) * 100}%`, background: slow ? "#f59e0b" : "#6366f1" }}
              />
            </div>
            <span className="w-10 text-slate-300">{b.count}</span>
            <span className="w-12 text-slate-500">{b.pct.toFixed(1)}%</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

type RTTab = "items" | "scatter" | "dist" | "model";
type SortKey = "meanRT" | "rtThetaCorr" | "rtAccCorr" | "sdLogRT";

export function IRTResponseTimePanel() {
  const [data, setData] = useState<IRTRTPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<RTTab>("items");
  const [sortKey, setSortKey] = useState<SortKey>("meanRT");
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch("/api/psychometrics/irt-rt-model");
      if (!r.ok) throw new Error(await r.text());
      setData(await r.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const kpis = data ? [
    { label: "Items", value: data.totalItems, icon: <Activity size={16} />, color: "#6366f1", fmt: String },
    { label: "Responses", value: data.totalResponses, icon: <Clock size={16} />, color: "#8b5cf6", fmt: (v: number) => v.toLocaleString() },
    { label: "Flagged Items", value: data.flaggedItems, icon: <AlertTriangle size={16} />, color: data.flaggedItems > 0 ? "#ef4444" : "#10b981", fmt: String },
    { label: "Mean RT", value: data.meanRTSeconds, icon: <CheckCircle2 size={16} />, color: data.meanRTSeconds > 60 ? "#f59e0b" : "#10b981", fmt: (v: number) => `${v.toFixed(1)}s` },
  ] : [];

  const sortedItems = data
    ? [...data.items]
        .filter((d) => !flaggedOnly || d.flagged)
        .sort((a, b) => {
          if (sortKey === "meanRT") return b.meanRT - a.meanRT;
          if (sortKey === "rtThetaCorr") return b.rtThetaCorr - a.rtThetaCorr;
          if (sortKey === "rtAccCorr") return a.rtAccCorr - b.rtAccCorr;
          return b.sdLogRT - a.sdLogRT;
        })
    : [];

  const TABS: { id: RTTab; label: string }[] = [
    { id: "items", label: "Item RT Stats" },
    { id: "scatter", label: "Speed–Ability" },
    { id: "dist", label: "RT Distribution" },
    { id: "model", label: "Log-Normal Model" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">IRT + Response Time Joint Model</h2>
          <p className="text-slate-400 text-sm mt-1">
            van der Linden (2007) hierarchical model · log-normal RT · speededness detection
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
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} className="accent-indigo-500" />
                Flagged only
              </label>
              <select
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
              >
                <option value="meanRT">Sort: Mean RT (desc)</option>
                <option value="rtThetaCorr">Sort: r(RT,θ) (desc)</option>
                <option value="rtAccCorr">Sort: r(RT,acc) (asc)</option>
                <option value="sdLogRT">Sort: σ log-RT</option>
              </select>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-400"><RefreshCw size={24} className="animate-spin mx-auto mb-3" />Loading…</div>
            ) : sortedItems.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No items match the current filter.</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-700/50">
                <table className="w-full text-xs text-slate-300">
                  <thead>
                    <tr className="bg-slate-800/80 text-slate-400">
                      <th className="px-3 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-left">Skill</th>
                      <th className="px-3 py-2 text-right">N</th>
                      <th className="px-3 py-2 text-right">Mean RT</th>
                      <th className="px-3 py-2 text-right">Med. RT</th>
                      <th className="px-3 py-2 text-right">σ log-RT</th>
                      <th className="px-3 py-2 text-right">r(RT,θ)</th>
                      <th className="px-3 py-2 text-right">r(RT,acc)</th>
                      <th className="px-3 py-2 text-center">Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedItems.map((d) => (
                      <tr key={d.itemId} className={`border-t border-slate-700/30 hover:bg-slate-800/40 ${d.flagged ? "bg-red-950/20" : ""}`}>
                        <td className="px-3 py-2 font-mono text-white">{d.itemLabel}</td>
                        <td className="px-3 py-2">
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium text-white" style={{ background: SKILL_COLORS[d.skill] ?? "#6366f1" }}>
                            {d.skill.slice(0, 3)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">{d.nResponses}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          <div className="space-y-0.5">
                            <RTBar meanRT={d.meanRT} sdLogRT={d.sdLogRT} flagged={d.slowFlag} />
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{d.medianRT.toFixed(1)}s</td>
                        <td className="px-3 py-2 text-right font-mono">{d.sdLogRT.toFixed(3)}</td>
                        <td className="px-3 py-2 text-right font-mono" style={{ color: d.rtThetaCorr > 0.3 ? "#ef4444" : d.rtThetaCorr > 0 ? "#f59e0b" : "#10b981" }}>
                          {d.rtThetaCorr.toFixed(3)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono" style={{ color: d.rtAccCorr < -0.15 ? "#10b981" : "#94a3b8" }}>
                          {d.rtAccCorr.toFixed(3)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {d.flagged
                            ? <span className="px-1.5 py-0.5 rounded bg-red-900/50 text-red-300 text-xs">⚠</span>
                            : <span className="px-1.5 py-0.5 rounded bg-emerald-900/50 text-emerald-300 text-xs">✓</span>
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

        {/* SCATTER */}
        {activeTab === "scatter" && (
          <motion.div key="scatter" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <p className="text-slate-400 text-xs leading-relaxed">
              Person-level scatter of mean log-RT vs. θ. In a well-behaved test, higher ability (θ) associates
              with shorter log-RT — a negative slope. A flat or positive slope suggests speededness contamination.
            </p>
            {loading ? (
              <div className="text-center py-12 text-slate-400"><RefreshCw size={24} className="animate-spin mx-auto mb-3" />Loading…</div>
            ) : data ? (
              <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 p-2">
                <PersonSpeedScatter data={data.personSpeedSample} />
              </div>
            ) : null}
          </motion.div>
        )}

        {/* DISTRIBUTION */}
        {activeTab === "dist" && (
          <motion.div key="dist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <p className="text-slate-400 text-xs">
              RT distribution across all responses. Responses &gt; 60s (amber) may indicate off-task behaviour.
            </p>
            {data && <RTDistChart bins={data.rtDistribution} />}
          </motion.div>
        )}

        {/* MODEL */}
        {activeTab === "model" && (
          <motion.div key="model" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <p className="text-slate-400 text-xs leading-relaxed">
              van der Linden (2007): Response time T ~ LogNormal(λ_j, τ) where λ_j = time-intensity of item j,
              and τ = person speed. High σ log-RT items have inconsistent timing behaviour across persons.
              r(RT, θ) &gt; 0.3 flags possible speededness (fast=correct bias).
            </p>
            {data ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.items.filter((d) => d.flagged).slice(0, 12).map((d) => (
                  <div key={d.itemId} className="bg-slate-800/60 rounded-xl p-4 border border-red-700/40">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-1.5 py-0.5 rounded text-xs font-medium text-white" style={{ background: SKILL_COLORS[d.skill] ?? "#6366f1" }}>
                        {d.skill.slice(0, 3)}
                      </span>
                      <span className="font-mono text-sm text-white">{d.itemLabel}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><div className="text-slate-500">λ (mean log-RT)</div><div className="text-white font-mono">{d.meanLogRT.toFixed(3)}</div></div>
                      <div><div className="text-slate-500">σ (log-RT)</div><div className="text-white font-mono">{d.sdLogRT.toFixed(3)}</div></div>
                      <div><div className="text-slate-500">r(RT, θ)</div><div className="font-mono" style={{ color: d.rtThetaCorr > 0.3 ? "#ef4444" : "#94a3b8" }}>{d.rtThetaCorr.toFixed(3)}</div></div>
                      <div><div className="text-slate-500">r(RT, acc)</div><div className="text-white font-mono">{d.rtAccCorr.toFixed(3)}</div></div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {d.speedFlag && <span className="px-1.5 py-0.5 rounded bg-red-900/50 text-red-300 text-xs">Speed bias</span>}
                      {d.slowFlag && <span className="px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300 text-xs">Slow item</span>}
                    </div>
                  </div>
                ))}
                {data.items.filter((d) => d.flagged).length === 0 && (
                  <div className="col-span-2 text-center py-8 text-slate-500">No flagged items — all RT profiles within acceptable range.</div>
                )}
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
