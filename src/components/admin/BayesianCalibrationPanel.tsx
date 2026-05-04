import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, Calculator, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ItemCalib {
  id: string;
  skill: string;
  cefrLevel: string;
  priorA: number;
  priorB: number;
  priorC: number;
  posteriorA: number;
  posteriorB: number;
  posteriorC: number;
  deltaA: number;
  deltaB: number;
  deltaC: number;
  nResponses: number;
  posteriorSE: number;
  converged: boolean;
}

interface CalibPayload {
  totalItems: number;
  convergedItems: number;
  divergedItems: number;
  meanDeltaB: number;
  meanPosteriorSE: number;
  items: ItemCalib[];
  convergenceBySkill: { skill: string; converged: number; total: number; rate: number }[];
  deltaBHistogram: { bin: number; count: number }[];
  seHistogram: { bin: number; count: number }[];
  priorPosteriorShift: { cefrLevel: string; meanBShift: number; sdBShift: number; n: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SKILL_COLORS: Record<string, string> = {
  GRAMMAR: "#3b82f6", VOCABULARY: "#10b981", READING: "#f59e0b",
  LISTENING: "#8b5cf6", WRITING: "#ef4444", SPEAKING: "#f97316",
};
const CEFR_BG: Record<string, string> = {
  PRE_A1: "#475569", A1: "#3b82f6", A2: "#06b6d4",
  B1: "#10b981", B2: "#f59e0b", C1: "#f97316", C2: "#ef4444",
};

// SVG mini-histogram
const MiniHistogram: React.FC<{
  bins: { bin: number; count: number }[];
  color: string;
  label: string;
  xLabel?: string;
}> = ({ bins, color, label, xLabel }) => {
  if (!bins.length) return null;
  const maxC = Math.max(...bins.map((b) => b.count), 1);
  return (
    <div className="bg-slate-900 rounded-xl p-4">
      <h4 className="text-xs font-semibold text-slate-300 mb-3">{label}</h4>
      <div className="flex items-end gap-px h-24">
        {bins.map((b, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm"
            style={{ height: `${Math.max(2, (b.count / maxC) * 88)}px`, backgroundColor: color }}
            title={`${b.bin.toFixed(2)}: n=${b.count}`}
          />
        ))}
      </div>
      {xLabel && <p className="text-[9px] text-slate-500 text-center mt-1">{xLabel}</p>}
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const BayesianCalibrationPanel: React.FC = () => {
  const [data, setData] = useState<CalibPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"items" | "skill" | "shift" | "histograms">("items");
  const [sortBy, setSortBy] = useState<"deltaB" | "posteriorSE" | "nResponses">("deltaB");
  const [divergedOnly, setDivergedOnly] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/psychometrics/bayesian-calibration")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const displayItems = data
    ? data.items
        .filter((i) => !divergedOnly || !i.converged)
        .sort((a, b) => {
          if (sortBy === "deltaB") return Math.abs(b.deltaB) - Math.abs(a.deltaB);
          if (sortBy === "posteriorSE") return b.posteriorSE - a.posteriorSE;
          return b.nResponses - a.nResponses;
        })
        .slice(0, 100)
    : [];

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calculator size={20} className="text-teal-400" />
            Bayesian IRT Calibration Monitor
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Prior-to-posterior parameter updates with MAP estimation (Mislevy &amp; Bock, 1982)
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
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "Items Tracked", value: data.totalItems.toLocaleString(), color: "text-teal-400" },
            { label: "Converged", value: data.convergedItems.toString(), color: "text-emerald-400" },
            { label: "Diverged", value: data.divergedItems.toString(), color: data.divergedItems > 0 ? "text-red-400" : "text-slate-400" },
            { label: "Mean |Δb|", value: data.meanDeltaB.toFixed(3), color: "text-amber-400" },
            { label: "Mean SE(b)", value: data.meanPosteriorSE.toFixed(3), color: "text-blue-400" },
          ].map((k) => (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800 border border-slate-700 rounded-xl p-3"
            >
              <p className="text-slate-400 text-xs mb-1">{k.label}</p>
              <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Tabs + controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["items", "skill", "shift", "histograms"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-teal-700 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
          >
            {t === "items" ? "Item Parameters" : t === "skill" ? "By Skill" : t === "shift" ? "CEFR Shift" : "Distributions"}
          </button>
        ))}
        {tab === "items" && (
          <>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="ml-auto bg-slate-700 border border-slate-600 text-slate-200 text-xs rounded-lg px-2 py-1"
            >
              <option value="deltaB">Sort by |Δb|</option>
              <option value="posteriorSE">Sort by SE(b)</option>
              <option value="nResponses">Sort by responses</option>
            </select>
            <label className="flex items-center gap-1.5 text-slate-300 text-xs cursor-pointer">
              <input type="checkbox" checked={divergedOnly} onChange={(e) => setDivergedOnly(e.target.checked)} className="accent-red-500" />
              Diverged only
            </label>
          </>
        )}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="load" className="flex justify-center py-16 text-slate-500 text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Running MAP calibration…
          </motion.div>
        ) : data && tab === "items" ? (
          <motion.div key="items" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-900">
                  <tr>
                    {["Item", "Skill", "CEFR", "Prior b", "Posterior b", "Δb", "Prior a", "Post a", "Δa", "n", "SE(b)", "Status"].map((h) => (
                      <th key={h} className="text-left text-slate-400 text-xs px-2 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayItems.length === 0 && (
                    <tr>
                      <td colSpan={12} className="text-center py-8 text-slate-500 text-sm">No items match filter.</td>
                    </tr>
                  )}
                  {displayItems.map((item) => (
                    <tr key={item.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                      <td className="px-2 py-1.5 text-slate-400 font-mono text-[10px]">{item.id.slice(-10)}</td>
                      <td className="px-2 py-1.5 font-medium text-xs" style={{ color: SKILL_COLORS[item.skill] ?? "#94a3b8" }}>
                        {item.skill}
                      </td>
                      <td className="px-2 py-1.5">
                        <span className="px-1 py-0.5 rounded text-[10px] text-white font-semibold" style={{ backgroundColor: CEFR_BG[item.cefrLevel] ?? "#475569" }}>
                          {item.cefrLevel.replace("_", "")}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-slate-400 text-xs">{item.priorB.toFixed(3)}</td>
                      <td className="px-2 py-1.5 text-slate-200 text-xs font-medium">{item.posteriorB.toFixed(3)}</td>
                      <td className={`px-2 py-1.5 text-xs font-semibold ${Math.abs(item.deltaB) > 0.5 ? "text-red-400" : Math.abs(item.deltaB) > 0.25 ? "text-amber-400" : "text-emerald-400"}`}>
                        {item.deltaB >= 0 ? "+" : ""}{item.deltaB.toFixed(3)}
                      </td>
                      <td className="px-2 py-1.5 text-slate-400 text-xs">{item.priorA.toFixed(3)}</td>
                      <td className="px-2 py-1.5 text-slate-200 text-xs">{item.posteriorA.toFixed(3)}</td>
                      <td className={`px-2 py-1.5 text-xs ${Math.abs(item.deltaA) > 0.3 ? "text-amber-400" : "text-slate-400"}`}>
                        {item.deltaA >= 0 ? "+" : ""}{item.deltaA.toFixed(3)}
                      </td>
                      <td className="px-2 py-1.5 text-slate-400 text-xs">{item.nResponses}</td>
                      <td className={`px-2 py-1.5 text-xs ${item.posteriorSE > 0.3 ? "text-amber-400" : "text-slate-400"}`}>
                        {item.posteriorSE.toFixed(3)}
                      </td>
                      <td className="px-2 py-1.5">
                        {item.converged
                          ? <span className="flex items-center gap-1 text-[10px] text-emerald-400"><CheckCircle2 size={10} />OK</span>
                          : <span className="flex items-center gap-1 text-[10px] text-red-400"><AlertCircle size={10} />Review</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : data && tab === "skill" ? (
          <motion.div key="skill" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Convergence by Skill</h3>
            <div className="space-y-3">
              {data.convergenceBySkill.map((s) => (
                <div key={s.skill} className="flex items-center gap-3">
                  <span className="text-xs w-24 font-medium" style={{ color: SKILL_COLORS[s.skill] ?? "#94a3b8" }}>
                    {s.skill}
                  </span>
                  <div className="flex-1 h-4 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${s.rate * 100}%` }}
                    />
                  </div>
                  <span className="text-slate-300 text-xs w-24 text-right">
                    {s.converged}/{s.total} ({(s.rate * 100).toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ) : data && tab === "shift" ? (
          <motion.div key="shift" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">
              Prior → Posterior b-parameter Shift by CEFR Level
            </h3>
            <div className="space-y-3">
              {data.priorPosteriorShift.map((s) => (
                <div key={s.cefrLevel} className="flex items-center gap-3">
                  <span className="px-1.5 py-0.5 rounded text-[10px] text-white font-semibold w-12 text-center" style={{ backgroundColor: CEFR_BG[s.cefrLevel] ?? "#475569" }}>
                    {s.cefrLevel.replace("_", "")}
                  </span>
                  <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden relative">
                    <div className="absolute top-0 left-1/2 w-0.5 h-full bg-slate-500" />
                    {s.meanBShift >= 0 ? (
                      <div
                        className="absolute top-0 h-full bg-teal-500 rounded-r-full"
                        style={{ left: "50%", width: `${Math.min(50, Math.abs(s.meanBShift) * 25)}%` }}
                      />
                    ) : (
                      <div
                        className="absolute top-0 h-full bg-red-500 rounded-l-full"
                        style={{ right: "50%", width: `${Math.min(50, Math.abs(s.meanBShift) * 25)}%` }}
                      />
                    )}
                  </div>
                  <span className="text-slate-400 text-xs w-28 text-right">
                    Δb={s.meanBShift >= 0 ? "+" : ""}{s.meanBShift.toFixed(3)} ± {s.sdBShift.toFixed(3)} (n={s.n})
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ) : data && tab === "histograms" ? (
          <motion.div key="histograms" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-4">
            <MiniHistogram bins={data.deltaBHistogram} color="#14b8a6" label="Δb Distribution (posterior − prior)" xLabel="Δb value" />
            <MiniHistogram bins={data.seHistogram} color="#6366f1" label="Posterior SE(b) Distribution" xLabel="SE value" />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
