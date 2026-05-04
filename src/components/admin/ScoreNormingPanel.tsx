import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, Database, CheckCircle2, Users, BarChart3 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NormRow {
  theta: number;
  percentile: number;
  stanine: number;
  tScore: number;
  nce: number;         // Normal Curve Equivalent: 21.06 * z + 50
  cefrLevel: string;
}

interface CefrNormGroup {
  cefrLevel: number;
  cefrLabel: string;
  n: number;
  meanTheta: number;
  sdTheta: number;
  meanTScore: number;
  sdTScore: number;
  percentile25: number;
  percentile50: number;
  percentile75: number;
}

interface NormingPayload {
  totalSessions: number;
  normTable: NormRow[];
  byCefr: CefrNormGroup[];
  stanineTable: { stanine: number; minTheta: number; maxTheta: number; n: number; pct: number }[];
  tScoreDistribution: { bin: string; count: number; pct: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CEFR_ORDER = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
const CEFR_COLORS: Record<string, string> = {
  PRE_A1: "#94a3b8", A1: "#64748b", A2: "#6366f1", B1: "#3b82f6",
  B2: "#06b6d4", C1: "#10b981", C2: "#f59e0b",
};
const STANINE_LABELS = ["", "Very Low", "Low", "Below Avg", "Below Avg", "Average", "Above Avg", "Above Avg", "High", "Very High"];

function StanineBar({ row }: { row: { stanine: number; pct: number } }) {
  const color = row.stanine <= 2 ? "#ef4444" : row.stanine <= 4 ? "#f59e0b" : row.stanine === 5 ? "#6366f1" : row.stanine <= 7 ? "#06b6d4" : "#10b981";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-5 text-center font-bold" style={{ color }}>{row.stanine}</span>
      <span className="w-24 text-slate-400">{STANINE_LABELS[row.stanine] ?? ""}</span>
      <div className="flex-1 bg-slate-800 rounded-full h-2">
        <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(100, row.pct * 2)}%`, background: color }} />
      </div>
      <span className="w-12 text-right text-slate-300">{row.pct.toFixed(1)}%</span>
    </div>
  );
}

function TScoreChart({ data }: { data: { bin: string; count: number; pct: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <div className="text-xs text-slate-400 mb-3">T-score distribution (mean=50, SD=10)</div>
      <div className="flex items-end gap-0.5 h-32">
        {data.map((d) => {
          const h = (d.count / max) * 100;
          const t = parseFloat(d.bin);
          const color = t >= 40 && t <= 60 ? "#6366f1" : t >= 30 && t < 40 ? "#f59e0b" : t > 60 && t <= 70 ? "#06b6d4" : "#ef4444";
          return (
            <div key={d.bin} className="flex-1 flex flex-col items-center">
              <div className="w-full rounded-t transition-all" style={{ height: `${h}%`, minHeight: d.count > 0 ? 2 : 0, background: color }} />
            </div>
          );
        })}
      </div>
      <div className="flex gap-0.5 mt-1">
        {data.map((d, i) => (
          <div key={d.bin} className="flex-1 text-center text-slate-500" style={{ fontSize: 8 }}>
            {i % 3 === 0 ? d.bin : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScoreNormingPanel() {
  const [data, setData] = useState<NormingPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"norms" | "cefr" | "stanine" | "tscore">("norms");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/psychometrics/score-norms");
      if (!r.ok) throw new Error(await r.text());
      setData(await r.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const kpiCards = data
    ? [
        { label: "Sessions", value: data.totalSessions, icon: <Users size={16} />, color: "#6366f1", fmt: (v: number) => v.toLocaleString() },
        { label: "Norm Points", value: data.normTable.length, icon: <Database size={16} />, color: "#8b5cf6", fmt: (v: number) => v.toString() },
        { label: "CEFR Groups", value: data.byCefr.length, icon: <BarChart3 size={16} />, color: "#06b6d4", fmt: (v: number) => v.toString() },
        { label: "Stanine Bands", value: data.stanineTable.length, icon: <CheckCircle2 size={16} />, color: "#10b981", fmt: (v: number) => v.toString() },
      ]
    : [];

  const tabs = [
    { id: "norms" as const, label: "Norm Table" },
    { id: "cefr" as const, label: "By CEFR" },
    { id: "stanine" as const, label: "Stanines" },
    { id: "tscore" as const, label: "T-Scores" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Score Scale & Norming</h2>
          <p className="text-xs text-slate-400 mt-0.5">Norm-referenced score conversions: percentile ranks, stanines, T-scores, and NCE scores</p>
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

        {!loading && activeTab === "norms" && data && (
          <motion.div key="norms" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-300">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="text-right py-2 pr-4">θ</th>
                    <th className="text-left py-2 pr-4">CEFR</th>
                    <th className="text-right py-2 pr-4">Percentile</th>
                    <th className="text-right py-2 pr-4">Stanine</th>
                    <th className="text-right py-2 pr-4">T-Score</th>
                    <th className="text-right py-2">NCE</th>
                  </tr>
                </thead>
                <tbody>
                  {data.normTable.map((row) => (
                    <tr key={row.theta} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-1.5 pr-4 text-right font-mono">{row.theta.toFixed(1)}</td>
                      <td className="py-1.5 pr-4">
                        <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: (CEFR_COLORS[row.cefrLevel] ?? "#64748b") + "22", color: CEFR_COLORS[row.cefrLevel] ?? "#94a3b8" }}>
                          {row.cefrLevel}
                        </span>
                      </td>
                      <td className="py-1.5 pr-4 text-right font-mono">{row.percentile.toFixed(0)}</td>
                      <td className="py-1.5 pr-4 text-right font-mono">{row.stanine}</td>
                      <td className="py-1.5 pr-4 text-right font-mono">{row.tScore.toFixed(1)}</td>
                      <td className="py-1.5 text-right font-mono">{row.nce.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {!loading && activeTab === "cefr" && data && (
          <motion.div key="cefr" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-slate-300">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="text-left py-2 pr-4">CEFR</th>
                    <th className="text-right py-2 pr-4">N</th>
                    <th className="text-right py-2 pr-4">Mean θ</th>
                    <th className="text-right py-2 pr-4">SD θ</th>
                    <th className="text-right py-2 pr-4">Mean T</th>
                    <th className="text-right py-2 pr-4">SD T</th>
                    <th className="text-right py-2 pr-4">P25 θ</th>
                    <th className="text-right py-2 pr-4">P50 θ</th>
                    <th className="text-right py-2">P75 θ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.byCefr.slice().sort((a, b) => CEFR_ORDER.indexOf(a.cefrLabel) - CEFR_ORDER.indexOf(b.cefrLabel)).map((row) => (
                    <tr key={row.cefrLabel} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-2 pr-4">
                        <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: (CEFR_COLORS[row.cefrLabel] ?? "#64748b") + "22", color: CEFR_COLORS[row.cefrLabel] ?? "#94a3b8" }}>
                          {row.cefrLabel}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right">{row.n}</td>
                      <td className="py-2 pr-4 text-right font-mono">{row.meanTheta.toFixed(2)}</td>
                      <td className="py-2 pr-4 text-right font-mono">{row.sdTheta.toFixed(2)}</td>
                      <td className="py-2 pr-4 text-right font-mono">{row.meanTScore.toFixed(1)}</td>
                      <td className="py-2 pr-4 text-right font-mono">{row.sdTScore.toFixed(1)}</td>
                      <td className="py-2 pr-4 text-right font-mono">{row.percentile25.toFixed(2)}</td>
                      <td className="py-2 pr-4 text-right font-mono">{row.percentile50.toFixed(2)}</td>
                      <td className="py-2 text-right font-mono">{row.percentile75.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {!loading && activeTab === "stanine" && data && (
          <motion.div key="stanine" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="bg-slate-800 rounded-xl p-4 space-y-3">
              <div className="text-xs text-slate-400 mb-3">Stanine bands — percentage of sessions in each band</div>
              {data.stanineTable.map((row) => (
                <StanineBar key={row.stanine} row={row} />
              ))}
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs text-slate-300">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="text-center py-2 pr-4">Stanine</th>
                    <th className="text-left py-2 pr-4">Label</th>
                    <th className="text-right py-2 pr-4">θ Min</th>
                    <th className="text-right py-2 pr-4">θ Max</th>
                    <th className="text-right py-2 pr-4">N</th>
                    <th className="text-right py-2">%</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stanineTable.map((row) => (
                    <tr key={row.stanine} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-1.5 pr-4 text-center font-bold text-slate-200">{row.stanine}</td>
                      <td className="py-1.5 pr-4 text-slate-400">{STANINE_LABELS[row.stanine]}</td>
                      <td className="py-1.5 pr-4 text-right font-mono">{row.minTheta.toFixed(2)}</td>
                      <td className="py-1.5 pr-4 text-right font-mono">{row.maxTheta.toFixed(2)}</td>
                      <td className="py-1.5 pr-4 text-right">{row.n}</td>
                      <td className="py-1.5 text-right">{row.pct.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {!loading && activeTab === "tscore" && data && (
          <motion.div key="tscore" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <TScoreChart data={data.tScoreDistribution} />
            <div className="mt-3 grid grid-cols-2 gap-3">
              {data.byCefr.slice().sort((a, b) => CEFR_ORDER.indexOf(a.cefrLabel) - CEFR_ORDER.indexOf(b.cefrLabel)).map((row) => (
                <div key={row.cefrLabel} className="bg-slate-800 rounded-xl p-3 border border-slate-700 flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded text-xs font-medium shrink-0" style={{ background: (CEFR_COLORS[row.cefrLabel] ?? "#64748b") + "22", color: CEFR_COLORS[row.cefrLabel] ?? "#94a3b8" }}>
                    {row.cefrLabel}
                  </span>
                  <div className="text-xs text-slate-400">T = <span className="font-mono text-white">{row.meanTScore.toFixed(1)}</span> ± <span className="font-mono text-slate-300">{row.sdTScore.toFixed(1)}</span></div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
