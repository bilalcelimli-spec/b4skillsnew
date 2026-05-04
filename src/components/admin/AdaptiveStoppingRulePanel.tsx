import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, Activity, CheckCircle2, AlertTriangle, Zap } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoppingSimRow {
  rule: string;            // e.g. "SEM≤0.30", "SEM≤0.35", "Fixed-20", "Fixed-30"
  ruleType: "sem" | "fixed" | "hybrid";
  semThreshold?: number;
  maxItems?: number;
  meanItemsUsed: number;
  sdItemsUsed: number;
  pctReachedTarget: number;  // % sessions where SEM target was reached
  meanFinalSEM: number;
  thetaBias: number;         // mean(estimated - true proxy)
  rmse: number;
  cefrAccuracy: number;      // % correct CEFR band
  efficiency: number;        // cefrAccuracy / meanItemsUsed × 100
}

interface SimulationPayload {
  totalSessions: number;
  rules: StoppingSimRow[];
  sessionHistory: {
    sessionId: string;
    cefrLevel: string;
    nItems: number;
    finalSEM: number;
    finalTheta: number;
    stopped: "sem" | "maxItems";
  }[];
  itemsVsSEM: { nItems: number; meanSEM: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CEFR_COLORS: Record<string, string> = {
  PRE_A1: "#94a3b8", A1: "#64748b", A2: "#6366f1", B1: "#3b82f6",
  B2: "#06b6d4", C1: "#10b981", C2: "#f59e0b",
};

function RuleCard({ row, best }: { row: StoppingSimRow; best: string }) {
  const isBest = row.rule === best;
  return (
    <div className={`bg-slate-800 rounded-xl p-4 border ${isBest ? "border-indigo-500" : "border-slate-700"}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-sm font-semibold text-white">{row.rule}</div>
          <div className="text-xs text-slate-400 capitalize">{row.ruleType}</div>
        </div>
        {isBest && (
          <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs rounded-full font-medium">Best</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-3">
        <div className="text-slate-400">Mean items</div>
        <div className="text-right font-mono text-slate-200">{row.meanItemsUsed.toFixed(1)}</div>
        <div className="text-slate-400">Target reached</div>
        <div className={`text-right font-mono ${row.pctReachedTarget >= 80 ? "text-emerald-400" : "text-amber-400"}`}>{row.pctReachedTarget.toFixed(1)}%</div>
        <div className="text-slate-400">Mean SEM</div>
        <div className={`text-right font-mono ${row.meanFinalSEM <= 0.35 ? "text-emerald-400" : "text-red-400"}`}>{row.meanFinalSEM.toFixed(3)}</div>
        <div className="text-slate-400">CEFR accuracy</div>
        <div className={`text-right font-mono ${row.cefrAccuracy >= 80 ? "text-emerald-400" : "text-amber-400"}`}>{row.cefrAccuracy.toFixed(1)}%</div>
        <div className="text-slate-400">Efficiency</div>
        <div className="text-right font-mono text-indigo-400">{row.efficiency.toFixed(2)}</div>
        <div className="text-slate-400">RMSE</div>
        <div className="text-right font-mono text-slate-300">{row.rmse.toFixed(3)}</div>
      </div>
    </div>
  );
}

function ItemsSEMCurve({ data }: { data: { nItems: number; meanSEM: number }[] }) {
  if (!data.length) return null;
  const W = 500, H = 160, PAD = { t: 16, r: 20, b: 32, l: 48 };
  const maxN = Math.max(...data.map((d) => d.nItems), 1);
  const minSEM = Math.min(...data.map((d) => d.meanSEM));
  const maxSEM = Math.max(...data.map((d) => d.meanSEM), 1);
  const xScale = (n: number) => PAD.l + ((n - data[0].nItems) / Math.max(1, maxN - data[0].nItems)) * (W - PAD.l - PAD.r);
  const yScale = (sem: number) => H - PAD.b - ((sem - minSEM) / Math.max(0.001, maxSEM - minSEM)) * (H - PAD.t - PAD.b);
  const path = data.map((d, i) => `${i === 0 ? "M" : "L"}${xScale(d.nItems).toFixed(1)},${yScale(d.meanSEM).toFixed(1)}`).join(" ");
  const targetY = yScale(0.35);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {/* Grid */}
      {[0.2, 0.3, 0.4, 0.5].map((sem) => {
        const y = yScale(sem);
        if (y < PAD.t || y > H - PAD.b) return null;
        return (
          <g key={sem}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#334155" strokeWidth="1" strokeDasharray="4 3" />
            <text x={PAD.l - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#64748b">{sem.toFixed(1)}</text>
          </g>
        );
      })}
      {/* Target line */}
      {targetY >= PAD.t && targetY <= H - PAD.b && (
        <line x1={PAD.l} y1={targetY} x2={W - PAD.r} y2={targetY} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5 3" />
      )}
      <path d={path} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinejoin="round" />
      {data.map((d) => (
        <circle key={d.nItems} cx={xScale(d.nItems)} cy={yScale(d.meanSEM)} r="3" fill="#6366f1" />
      ))}
      {/* Axes */}
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="#475569" strokeWidth="1" />
      <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="#475569" strokeWidth="1" />
      {/* X labels */}
      {data.filter((_, i) => i % Math.ceil(data.length / 8) === 0).map((d) => (
        <text key={d.nItems} x={xScale(d.nItems)} y={H - PAD.b + 14} textAnchor="middle" fontSize="9" fill="#64748b">{d.nItems}</text>
      ))}
      {/* Axis labels */}
      <text x={W / 2} y={H - 2} textAnchor="middle" fontSize="9" fill="#64748b">Items Administered</text>
      <text x={12} y={H / 2} textAnchor="middle" fontSize="9" fill="#64748b" transform={`rotate(-90,12,${H / 2})`}>Mean SEM</text>
      {/* Target label */}
      <text x={W - PAD.r + 2} y={Math.max(PAD.t + 8, targetY - 3)} fontSize="8" fill="#f59e0b">0.35</text>
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdaptiveStoppingRulePanel() {
  const [data, setData] = useState<SimulationPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"rules" | "sessions" | "curve">("rules");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/psychometrics/stopping-rule-sim");
      if (!r.ok) throw new Error(await r.text());
      setData(await r.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Find best rule by efficiency
  const bestRule = data?.rules.length
    ? data.rules.reduce((best, r) => r.efficiency > best.efficiency ? r : best, data.rules[0]).rule
    : "";

  const kpiCards = data
    ? [
        { label: "Sessions", value: data.totalSessions, icon: <Activity size={16} />, color: "#6366f1", fmt: (v: number) => v.toLocaleString() },
        { label: "Rules Compared", value: data.rules.length, icon: <Zap size={16} />, color: "#8b5cf6", fmt: (v: number) => v.toString() },
        {
          label: "Best Rule",
          value: data.rules.find((r) => r.rule === bestRule)?.meanItemsUsed ?? 0,
          icon: <CheckCircle2 size={16} />,
          color: "#10b981",
          fmt: (v: number) => `${v.toFixed(1)} items`,
        },
        {
          label: "Best CEFR Acc.",
          value: data.rules.find((r) => r.rule === bestRule)?.cefrAccuracy ?? 0,
          icon: <AlertTriangle size={16} />,
          color: "#f59e0b",
          fmt: (v: number) => `${v.toFixed(1)}%`,
        },
      ]
    : [];

  const tabs = [
    { id: "rules" as const, label: "Rule Comparison" },
    { id: "sessions" as const, label: "Session History" },
    { id: "curve" as const, label: "Items vs SEM" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Adaptive Stopping Rule Simulation</h2>
          <p className="text-xs text-slate-400 mt-0.5">Empirical evaluation of SEM-based vs. fixed-length CAT stopping rules</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}

      {/* KPI Cards */}
      {data && (
        <div className="grid grid-cols-4 gap-3">
          {kpiCards.map((kpi) => (
            <div key={kpi.label} className="bg-slate-800 rounded-xl p-3 border border-slate-700">
              <div className="flex items-center gap-1.5 mb-1" style={{ color: kpi.color }}>
                {kpi.icon}
                <span className="text-xs text-slate-400">{kpi.label}</span>
              </div>
              <div className="text-2xl font-bold text-white">{kpi.fmt(kpi.value)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-700">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === t.id ? "border-indigo-500 text-white" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center justify-center h-40 text-slate-400 text-sm"
          >
            <RefreshCw size={20} className="animate-spin mr-2" /> Loading…
          </motion.div>
        )}

        {!loading && activeTab === "rules" && data && (
          <motion.div key="rules" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.rules.map((row) => (
                <RuleCard key={row.rule} row={row} best={bestRule} />
              ))}
            </div>
          </motion.div>
        )}

        {!loading && activeTab === "sessions" && data && (
          <motion.div key="sessions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-300">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="text-left py-2 pr-4">Session</th>
                    <th className="text-left py-2 pr-4">CEFR</th>
                    <th className="text-right py-2 pr-4">N Items</th>
                    <th className="text-right py-2 pr-4">Final SEM</th>
                    <th className="text-right py-2 pr-4">Final θ</th>
                    <th className="text-left py-2">Stopped by</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sessionHistory.slice(0, 200).map((s) => (
                    <tr key={s.sessionId} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-2 pr-4 font-mono text-slate-400 text-xs">{s.sessionId.slice(-8)}</td>
                      <td className="py-2 pr-4">
                        <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: (CEFR_COLORS[s.cefrLevel] ?? "#64748b") + "22", color: CEFR_COLORS[s.cefrLevel] ?? "#94a3b8" }}>
                          {s.cefrLevel}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right">{s.nItems}</td>
                      <td className={`py-2 pr-4 text-right font-mono ${s.finalSEM <= 0.35 ? "text-emerald-400" : "text-red-400"}`}>{s.finalSEM.toFixed(3)}</td>
                      <td className="py-2 pr-4 text-right font-mono">{s.finalTheta.toFixed(2)}</td>
                      <td className="py-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${s.stopped === "sem" ? "bg-emerald-900/40 text-emerald-400" : "bg-amber-900/40 text-amber-400"}`}>
                          {s.stopped === "sem" ? "SEM target" : "Max items"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {!loading && activeTab === "curve" && data && (
          <motion.div key="curve" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 mb-3">Mean SEM as a function of items administered (amber line = 0.35 target)</div>
              <ItemsSEMCurve data={data.itemsVsSEM} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
