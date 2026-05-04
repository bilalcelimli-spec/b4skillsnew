import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, Calculator, CheckCircle2, AlertTriangle, Zap } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StrategyResult {
  strategy: string;        // "MFI" | "MEI" | "Random" | "Actual"
  description: string;
  meanItemsToTarget: number;
  sdItemsToTarget: number;
  pctReachedTarget: number;
  meanFinalSEM: number;
  cefrAccuracy: number;
  efficiency: number;       // cefrAccuracy / meanItems * 10
  avgInfoGain: number;      // mean Fisher info per item under this strategy
}

interface CATSimPayload {
  totalSessions: number;
  semTarget: number;
  strategies: StrategyResult[];
  curves: {
    strategy: string;
    points: { n: number; meanSEM: number; meanInfo: number }[];
  }[];
  sessionSample: {
    sessionId: string;
    cefrLevel: string;
    nItemsActual: number;
    semActual: number;
    nItemsMFI: number;
    semMFI: number;
    thetaEstimate: number;
  }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STRATEGY_COLORS: Record<string, string> = {
  MFI: "#6366f1",
  MEI: "#8b5cf6",
  Random: "#f59e0b",
  Actual: "#06b6d4",
};

function StrategyCurveSVG({ curves }: { curves: CATSimPayload["curves"] }) {
  if (!curves.length || !curves[0].points.length) return null;
  const W = 540, H = 160, PAD = { t: 16, r: 60, b: 32, l: 48 };
  const allPoints = curves.flatMap((c) => c.points);
  const minN = Math.min(...allPoints.map((p) => p.n));
  const maxN = Math.max(...allPoints.map((p) => p.n));
  const maxSEM = Math.max(...allPoints.map((p) => p.meanSEM), 0.5);
  const minSEM = Math.min(...allPoints.map((p) => p.meanSEM), 0);

  const xS = (n: number) => PAD.l + ((n - minN) / Math.max(1, maxN - minN)) * (W - PAD.l - PAD.r);
  const yS = (sem: number) => H - PAD.b - ((sem - minSEM) / Math.max(0.001, maxSEM - minSEM)) * (H - PAD.t - PAD.b);
  const targetY = yS(0.35);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {[0.2, 0.3, 0.4, 0.5].map((sem) => {
        const y = yS(sem);
        if (y < PAD.t || y > H - PAD.b) return null;
        return (
          <g key={sem}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#334155" strokeWidth="1" strokeDasharray="4 3" />
            <text x={PAD.l - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#64748b">{sem.toFixed(1)}</text>
          </g>
        );
      })}
      {targetY >= PAD.t && targetY <= H - PAD.b && (
        <>
          <line x1={PAD.l} y1={targetY} x2={W - PAD.r} y2={targetY} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5 3" />
          <text x={W - PAD.r + 3} y={targetY + 4} fontSize="8" fill="#f59e0b">0.35</text>
        </>
      )}
      {curves.map((curve) => {
        const pts = curve.points;
        if (!pts.length) return null;
        const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${xS(p.n).toFixed(1)},${yS(p.meanSEM).toFixed(1)}`).join(" ");
        const color = STRATEGY_COLORS[curve.strategy] ?? "#64748b";
        return (
          <g key={curve.strategy}>
            <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
            <text x={xS(pts[pts.length - 1].n) + 4} y={yS(pts[pts.length - 1].meanSEM) + 4} fontSize="9" fill={color}>{curve.strategy}</text>
          </g>
        );
      })}
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="#475569" strokeWidth="1" />
      <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="#475569" strokeWidth="1" />
      {[minN, Math.round((minN + maxN) / 2), maxN].map((n) => (
        <text key={n} x={xS(n)} y={H - PAD.b + 14} textAnchor="middle" fontSize="9" fill="#64748b">{n}</text>
      ))}
      <text x={W / 2} y={H - 2} textAnchor="middle" fontSize="9" fill="#64748b">Items Administered</text>
      <text x={12} y={H / 2} textAnchor="middle" fontSize="9" fill="#64748b" transform={`rotate(-90,12,${H / 2})`}>Mean SEM</text>
    </svg>
  );
}

function StrategyCard({ row, isBest }: { row: StrategyResult; isBest: boolean }) {
  const color = STRATEGY_COLORS[row.strategy] ?? "#64748b";
  return (
    <div className={`bg-slate-800 rounded-xl p-4 border ${isBest ? "border-indigo-500" : "border-slate-700"}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-sm font-bold" style={{ color }}>{row.strategy}</div>
          <div className="text-xs text-slate-400">{row.description}</div>
        </div>
        {isBest && <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs rounded-full font-medium">Best</span>}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div className="text-slate-400">Items to target</div>
        <div className="text-right font-mono text-slate-200">{row.meanItemsToTarget.toFixed(1)}</div>
        <div className="text-slate-400">Target reached</div>
        <div className={`text-right font-mono ${row.pctReachedTarget >= 80 ? "text-emerald-400" : "text-amber-400"}`}>{row.pctReachedTarget.toFixed(1)}%</div>
        <div className="text-slate-400">Mean SEM</div>
        <div className={`text-right font-mono ${row.meanFinalSEM <= 0.35 ? "text-emerald-400" : "text-red-400"}`}>{row.meanFinalSEM.toFixed(3)}</div>
        <div className="text-slate-400">CEFR accuracy</div>
        <div className={`text-right font-mono ${row.cefrAccuracy >= 80 ? "text-emerald-400" : "text-amber-400"}`}>{row.cefrAccuracy.toFixed(1)}%</div>
        <div className="text-slate-400">Efficiency</div>
        <div className="text-right font-mono text-indigo-400">{row.efficiency.toFixed(2)}</div>
        <div className="text-slate-400">Avg info/item</div>
        <div className="text-right font-mono text-slate-300">{row.avgInfoGain.toFixed(3)}</div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CATItemSelectionPanel() {
  const [data, setData] = useState<CATSimPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"strategies" | "curves" | "sessions">("strategies");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/psychometrics/cat-sim");
      if (!r.ok) throw new Error(await r.text());
      setData(await r.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const bestStrategy = data?.strategies.length
    ? data.strategies.reduce((best, s) => s.efficiency > best.efficiency ? s : best, data.strategies[0]).strategy
    : "";

  const kpiCards = data
    ? [
        { label: "Sessions", value: data.totalSessions, icon: <Zap size={16} />, color: "#6366f1", fmt: (v: number) => v.toLocaleString() },
        { label: "Strategies", value: data.strategies.length, icon: <Calculator size={16} />, color: "#8b5cf6", fmt: (v: number) => v.toString() },
        { label: "Best Strategy", value: 0, label2: bestStrategy, icon: <CheckCircle2 size={16} />, color: "#10b981", fmt: () => bestStrategy },
        {
          label: "SEM Target",
          value: data.semTarget,
          icon: <AlertTriangle size={16} />,
          color: "#f59e0b",
          fmt: (v: number) => v.toFixed(2),
        },
      ]
    : [];

  const tabs = [
    { id: "strategies" as const, label: "Strategy Cards" },
    { id: "curves" as const, label: "SEM Curves" },
    { id: "sessions" as const, label: "Session Comparison" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">CAT Item Selection Strategy Analysis</h2>
          <p className="text-xs text-slate-400 mt-0.5">Empirical comparison of Maximum Fisher Information, Maximum Expected Information, and Random item selection</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-200 transition-colors disabled:opacity-50">
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}

      {data && (
        <div className="grid grid-cols-4 gap-3">
          {kpiCards.map((kpi) => (
            <div key={kpi.label} className="bg-slate-800 rounded-xl p-3 border border-slate-700">
              <div className="flex items-center gap-1.5 mb-1" style={{ color: kpi.color }}>
                {kpi.icon}<span className="text-xs text-slate-400">{kpi.label}</span>
              </div>
              <div className="text-2xl font-bold text-white">{kpi.fmt(kpi.value)}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-1 border-b border-slate-700">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === t.id ? "border-indigo-500 text-white" : "border-transparent text-slate-400 hover:text-slate-200"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center justify-center h-40 text-slate-400 text-sm">
            <RefreshCw size={20} className="animate-spin mr-2" /> Loading…
          </motion.div>
        )}

        {!loading && activeTab === "strategies" && data && (
          <motion.div key="strategies" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {data.strategies.map((row) => (
                <StrategyCard key={row.strategy} row={row} isBest={row.strategy === bestStrategy} />
              ))}
            </div>
          </motion.div>
        )}

        {!loading && activeTab === "curves" && data && (
          <motion.div key="curves" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="bg-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 mb-3">Mean SEM by items administered for each selection strategy (amber = 0.35 target)</div>
              <StrategyCurveSVG curves={data.curves} />
            </div>
            <div className="mt-3 flex gap-4 flex-wrap">
              {Object.entries(STRATEGY_COLORS).map(([strategy, color]) => (
                <div key={strategy} className="flex items-center gap-1.5 text-xs text-slate-400">
                  <div className="w-6 h-0.5" style={{ background: color }} />
                  {strategy}
                </div>
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
                    <th className="text-left py-2 pr-3">Session</th>
                    <th className="text-left py-2 pr-3">CEFR</th>
                    <th className="text-right py-2 pr-3">θ</th>
                    <th className="text-right py-2 pr-3">Actual N</th>
                    <th className="text-right py-2 pr-3">Actual SEM</th>
                    <th className="text-right py-2 pr-3">MFI N</th>
                    <th className="text-right py-2 pr-3">MFI SEM</th>
                    <th className="text-right py-2">Δ items</th>
                  </tr>
                </thead>
                <tbody>
                  {data.sessionSample.slice(0, 200).map((s) => (
                    <tr key={s.sessionId} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-2 pr-3 font-mono text-slate-500">{s.sessionId.slice(-8)}</td>
                      <td className="py-2 pr-3 text-slate-300">{s.cefrLevel}</td>
                      <td className="py-2 pr-3 text-right font-mono">{s.thetaEstimate.toFixed(2)}</td>
                      <td className="py-2 pr-3 text-right">{s.nItemsActual}</td>
                      <td className={`py-2 pr-3 text-right font-mono ${s.semActual <= 0.35 ? "text-emerald-400" : "text-red-400"}`}>{s.semActual.toFixed(3)}</td>
                      <td className="py-2 pr-3 text-right">{s.nItemsMFI}</td>
                      <td className={`py-2 pr-3 text-right font-mono ${s.semMFI <= 0.35 ? "text-emerald-400" : "text-red-400"}`}>{s.semMFI.toFixed(3)}</td>
                      <td className={`py-2 text-right font-mono ${s.nItemsMFI < s.nItemsActual ? "text-emerald-400" : "text-slate-400"}`}>
                        {s.nItemsMFI - s.nItemsActual > 0 ? "+" : ""}{s.nItemsMFI - s.nItemsActual}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
