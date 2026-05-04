import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, TrendingDown, Activity, BarChart3, Layers } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StageStats {
  stage: number;
  meanTheta: number;
  meanSem: number;
  meanInfo: number;
  n: number;
}

interface ConvergenceRow {
  sessionId: string;
  thetaStages: number[];
  semStages: number[];
  finalTheta: number;
  finalSem: number;
  cefrLevel: string;
  nItems: number;
  converged: boolean;
}

interface DiagnosticsPayload {
  sampleSize: number;
  meanFinalTheta: number;
  meanFinalSem: number;
  convergenceRate: number;
  stageStats: StageStats[];   // mean theta/SEM by adaptive stage
  semHistogram: { bin: number; count: number }[];
  recentSessions: ConvergenceRow[];
  thetaDistribution: { bin: number; count: number; cefrLevel: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CEFR_COLORS: Record<string, string> = {
  PRE_A1: "#64748b", A1: "#3b82f6", A2: "#06b6d4",
  B1: "#10b981", B2: "#f59e0b", C1: "#f97316", C2: "#ef4444",
};

function semQuality(sem: number): { label: string; color: string } {
  if (sem <= 0.30) return { label: "Excellent", color: "text-emerald-400" };
  if (sem <= 0.40) return { label: "Good", color: "text-cyan-400" };
  if (sem <= 0.50) return { label: "Acceptable", color: "text-amber-400" };
  return { label: "High error", color: "text-red-400" };
}

const CEFR_THETA: Record<string, number> = {
  PRE_A1: -3.5, A1: -2.0, A2: -1.0, B1: 0.0, B2: 1.0, C1: 2.0, C2: 3.0,
};

// ─── Component ────────────────────────────────────────────────────────────────

export const ThetaDiagnosticsPanel: React.FC = () => {
  const [data, setData] = useState<DiagnosticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"convergence" | "sem" | "sessions">("convergence");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/psychometrics/theta-diagnostics")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  // Stage convergence SVG chart
  const StageChart: React.FC<{ stages: StageStats[] }> = ({ stages }) => {
    if (stages.length === 0) return <p className="text-slate-500 text-sm text-center py-8">No stage data.</p>;
    const W = 520, H = 140, pad = 40;
    const maxSem = Math.max(...stages.map((s) => s.meanSem)) * 1.1;
    const xScale = (i: number) => pad + (i / (stages.length - 1 || 1)) * (W - pad * 2);
    const yScale = (v: number) => H - pad - (v / maxSem) * (H - pad * 1.4);
    const semPath = stages.map((s, i) => `${i === 0 ? "M" : "L"} ${xScale(i).toFixed(1)} ${yScale(s.meanSem).toFixed(1)}`).join(" ");
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {/* Grid lines */}
        {[0.2, 0.4, 0.6].map((v) => (
          <g key={v}>
            <line x1={pad} y1={yScale(v)} x2={W - pad} y2={yScale(v)} stroke="#334155" strokeWidth={1} strokeDasharray="4,2" />
            <text x={pad - 4} y={yScale(v) + 3} fill="#64748b" fontSize={9} textAnchor="end">{v.toFixed(1)}</text>
          </g>
        ))}
        {/* SEM curve */}
        <path d={semPath} fill="none" stroke="#f59e0b" strokeWidth={2} />
        {/* Points */}
        {stages.map((s, i) => (
          <g key={i}>
            <circle cx={xScale(i)} cy={yScale(s.meanSem)} r={4} fill="#f59e0b" />
            <text x={xScale(i)} y={H - 8} fill="#94a3b8" fontSize={9} textAnchor="middle">S{s.stage}</text>
          </g>
        ))}
        {/* Threshold line at 0.30 */}
        <line x1={pad} y1={yScale(0.30)} x2={W - pad} y2={yScale(0.30)} stroke="#10b981" strokeWidth={1} strokeDasharray="6,3" />
        <text x={W - pad + 2} y={yScale(0.30) + 3} fill="#10b981" fontSize={8}>SEM=0.30</text>
        {/* Axis labels */}
        <text x={W / 2} y={H - 1} fill="#94a3b8" fontSize={9} textAnchor="middle">Adaptive Stage</text>
        <text x={9} y={H / 2} fill="#94a3b8" fontSize={9} textAnchor="middle" transform={`rotate(-90, 9, ${H / 2})`}>Mean SEM</text>
      </svg>
    );
  };

  // SEM histogram
  const SemHistogram: React.FC<{ bins: { bin: number; count: number }[] }> = ({ bins }) => {
    if (bins.length === 0) return <p className="text-slate-500 text-sm text-center py-8">No data.</p>;
    const maxCount = Math.max(...bins.map((b) => b.count), 1);
    return (
      <div className="flex items-end gap-0.5 h-32">
        {bins.map((b, i) => {
          const pct = b.count / maxCount;
          const q = semQuality(b.bin);
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5" title={`SEM≈${b.bin.toFixed(2)}: ${b.count}`}>
              <div
                className="w-full rounded-t-sm transition-all"
                style={{
                  height: `${Math.max(2, pct * 112)}px`,
                  backgroundColor: b.bin <= 0.30 ? "#10b981" : b.bin <= 0.45 ? "#f59e0b" : "#ef4444",
                }}
              />
              {i % 3 === 0 && <span className="text-[8px] text-slate-500">{b.bin.toFixed(1)}</span>}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingDown size={20} className="text-cyan-400" />
            Theta Estimation Diagnostics
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            EAP convergence, SEM reduction by stage, and estimation quality
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>
      )}

      {/* KPI cards */}
      {data && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Sessions Analysed", value: data.sampleSize.toLocaleString(), color: "text-cyan-400" },
            { label: "Mean Final θ", value: data.meanFinalTheta.toFixed(2), color: "text-white" },
            {
              label: "Mean Final SEM",
              value: data.meanFinalSem.toFixed(3),
              color: semQuality(data.meanFinalSem).color,
            },
            {
              label: "Convergence Rate",
              value: `${Math.round(data.convergenceRate * 100)}%`,
              color: data.convergenceRate >= 0.90 ? "text-emerald-400" : data.convergenceRate >= 0.75 ? "text-amber-400" : "text-red-400",
            },
          ].map((k) => (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800 border border-slate-700 rounded-xl p-4"
            >
              <p className="text-slate-400 text-xs mb-1">{k.label}</p>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {(["convergence", "sem", "sessions"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-cyan-700 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
          >
            {t === "convergence" ? "SEM by Stage" : t === "sem" ? "SEM Distribution" : "Recent Sessions"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="load" className="flex justify-center py-16 text-slate-500 text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Loading diagnostics…
          </motion.div>
        ) : data && tab === "convergence" ? (
          <motion.div key="conv" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Mean SEM Reduction Across Adaptive Stages</h3>
            <StageChart stages={data.stageStats} />
            {data.stageStats.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-xs text-slate-400">
                  <thead>
                    <tr className="border-b border-slate-700">
                      {["Stage", "n", "Mean θ", "Mean SEM", "Mean Info", "SEM Quality"].map((h) => (
                        <th key={h} className="text-left px-2 py-1">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.stageStats.map((s) => {
                      const q = semQuality(s.meanSem);
                      return (
                        <tr key={s.stage} className="border-b border-slate-800">
                          <td className="px-2 py-1 text-cyan-400 font-semibold">Stage {s.stage}</td>
                          <td className="px-2 py-1">{s.n}</td>
                          <td className="px-2 py-1">{s.meanTheta.toFixed(3)}</td>
                          <td className={`px-2 py-1 font-semibold ${q.color}`}>{s.meanSem.toFixed(3)}</td>
                          <td className="px-2 py-1">{s.meanInfo.toFixed(2)}</td>
                          <td className={`px-2 py-1 font-semibold ${q.color}`}>{q.label}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        ) : data && tab === "sem" ? (
          <motion.div key="sem" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Final SEM Distribution</h3>
            <SemHistogram bins={data.semHistogram} />
            <div className="mt-3 flex gap-4 text-[11px] text-slate-400">
              {[
                { color: "bg-emerald-500", label: "SEM ≤ 0.30 — Excellent" },
                { color: "bg-amber-500", label: "SEM 0.31–0.45 — Acceptable" },
                { color: "bg-red-500", label: "SEM > 0.45 — High error" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded ${l.color}`} />
                  <span>{l.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ) : data && tab === "sessions" ? (
          <motion.div key="sess" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-900">
                  <tr>
                    {["Session ID", "Items", "Final θ", "Final SEM", "CEFR", "Converged"].map((h) => (
                      <th key={h} className="text-left text-slate-400 text-xs px-3 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.recentSessions.map((s) => {
                    const q = semQuality(s.finalSem);
                    return (
                      <tr key={s.sessionId} className="border-t border-slate-700 hover:bg-slate-700/30 transition-colors">
                        <td className="px-3 py-2 text-slate-400 text-xs font-mono">{s.sessionId.slice(-10)}</td>
                        <td className="px-3 py-2 text-slate-300">{s.nItems}</td>
                        <td className="px-3 py-2 text-white font-semibold">{s.finalTheta.toFixed(2)}</td>
                        <td className={`px-3 py-2 font-semibold ${q.color}`}>{s.finalSem.toFixed(3)}</td>
                        <td className="px-3 py-2">
                          <span
                            className="px-2 py-0.5 rounded text-xs font-semibold text-white"
                            style={{ backgroundColor: CEFR_COLORS[s.cefrLevel] ?? "#475569" }}
                          >
                            {s.cefrLevel.replace("_", "")}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {s.converged
                            ? <span className="text-emerald-400 text-xs">✓ Yes</span>
                            : <span className="text-amber-400 text-xs">⚠ No</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {data.recentSessions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-500 text-sm">No completed sessions found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
