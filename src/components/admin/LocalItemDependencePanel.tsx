import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, Key, AlertTriangle, CheckCircle2, Grid3x3 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ItemPair {
  itemA: string;
  skillA: string;
  cefrA: string;
  itemB: string;
  skillB: string;
  cefrB: string;
  q3Stat: number;       // Yen's Q3 (residual correlation)
  flagged: boolean;     // |Q3| > 0.2
  nCommon: number;      // sessions where both items appeared
}

interface LIDPayload {
  totalItems: number;
  pairsAnalysed: number;
  flaggedPairs: number;
  meanQ3: number;
  maxQ3: number;
  pairs: ItemPair[];
  heatmapItems: string[];      // item IDs for heatmap axes
  heatmapMatrix: number[][];   // NxN Q3 matrix (NaN for unchecked)
  bySkillPair: { pair: string; meanQ3: number; flaggedCount: number }[];
  q3Histogram: { bin: number; count: number }[];
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

function q3Color(q3: number): string {
  const abs = Math.abs(q3);
  if (abs > 0.4) return "#ef4444";
  if (abs > 0.2) return "#f59e0b";
  if (abs > 0.1) return "#06b6d4";
  return "#1e293b";
}

// ─── Heatmap ─────────────────────────────────────────────────────────────────

const Q3Heatmap: React.FC<{ items: string[]; matrix: number[][] }> = ({ items, matrix }) => {
  const n = Math.min(items.length, 20);
  const CELL = 18;
  const W = n * CELL + 80;
  const H = n * CELL + 40;
  return (
    <div className="overflow-auto max-h-96">
      <svg width={W} height={H} style={{ fontFamily: "monospace" }}>
        {Array.from({ length: n }, (_, i) => (
          <text key={`yl-${i}`} x={72} y={40 + i * CELL + CELL / 2 + 4} textAnchor="end" fill="#94a3b8" fontSize={8}>
            {items[i]?.slice(-6)}
          </text>
        ))}
        {Array.from({ length: n }, (_, j) => (
          <text key={`xl-${j}`} x={80 + j * CELL + CELL / 2} y={28} textAnchor="middle" fill="#94a3b8" fontSize={8}
            transform={`rotate(-45, ${80 + j * CELL + CELL / 2}, 28)`}>
            {items[j]?.slice(-6)}
          </text>
        ))}
        {Array.from({ length: n }, (_, i) =>
          Array.from({ length: n }, (_, j) => {
            const val = matrix[i]?.[j];
            if (val === undefined || isNaN(val)) return null;
            const color = i === j ? "#334155" : q3Color(val);
            return (
              <rect key={`${i}-${j}`}
                x={80 + j * CELL} y={40 + i * CELL}
                width={CELL - 1} height={CELL - 1}
                fill={color} rx={1}
              >
                <title>{`${items[i]?.slice(-8)} × ${items[j]?.slice(-8)}: Q3=${val?.toFixed(3)}`}</title>
              </rect>
            );
          })
        )}
      </svg>
    </div>
  );
};

// ─── Q3 histogram ─────────────────────────────────────────────────────────────

const Q3Histogram: React.FC<{ bins: { bin: number; count: number }[] }> = ({ bins }) => {
  const maxC = Math.max(...bins.map((b) => b.count), 1);
  return (
    <div className="flex items-end gap-px h-24">
      {bins.map((b, i) => (
        <div key={i} className="flex-1 rounded-t-sm" style={{
          height: `${Math.max(2, (b.count / maxC) * 88)}px`,
          backgroundColor: Math.abs(b.bin) > 0.4 ? "#ef4444" : Math.abs(b.bin) > 0.2 ? "#f59e0b" : "#06b6d4",
        }} title={`Q3≈${b.bin.toFixed(2)}: ${b.count}`} />
      ))}
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const LocalItemDependencePanel: React.FC = () => {
  const [data, setData] = useState<LIDPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"pairs" | "heatmap" | "skill" | "histogram">("pairs");
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/psychometrics/local-dependence")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const displayPairs = data
    ? data.pairs
        .filter((p) => !flaggedOnly || p.flagged)
        .sort((a, b) => Math.abs(b.q3Stat) - Math.abs(a.q3Stat))
        .slice(0, 100)
    : [];

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Grid3x3 size={20} className="text-indigo-400" />
            Local Item Dependence (Q3)
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Yen's Q3 residual correlation matrix — flags item pairs violating local independence (Yen, 1984)
          </p>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && <div className="bg-red-900/40 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>}

      {/* KPI cards */}
      {data && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "Items", value: data.totalItems.toLocaleString(), color: "text-indigo-400" },
            { label: "Pairs Analysed", value: data.pairsAnalysed.toLocaleString(), color: "text-blue-400" },
            { label: "Flagged Pairs", value: data.flaggedPairs.toString(), color: data.flaggedPairs > 0 ? "text-red-400" : "text-emerald-400" },
            { label: "Mean |Q3|", value: data.meanQ3.toFixed(3), color: "text-slate-300" },
            { label: "Max |Q3|", value: data.maxQ3.toFixed(3), color: data.maxQ3 > 0.4 ? "text-red-400" : data.maxQ3 > 0.2 ? "text-amber-400" : "text-emerald-400" },
          ].map((k) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800 border border-slate-700 rounded-xl p-3">
              <p className="text-slate-400 text-xs mb-1">{k.label}</p>
              <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 text-[11px] text-slate-400">
        {[
          { color: "bg-cyan-500", label: "|Q3| < 0.2 — OK" },
          { color: "bg-amber-500", label: "0.2–0.4 — Moderate LD" },
          { color: "bg-red-500", label: "> 0.4 — Severe LD — review item pair" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded ${l.color}`} />
            <span>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["pairs", "heatmap", "skill", "histogram"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-indigo-700 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
            {t === "pairs" ? "Item Pairs" : t === "heatmap" ? "Q3 Heatmap" : t === "skill" ? "By Skill Pair" : "Distribution"}
          </button>
        ))}
        {tab === "pairs" && (
          <label className="ml-auto flex items-center gap-1.5 text-slate-300 text-xs cursor-pointer">
            <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} className="accent-red-500" />
            Flagged only
          </label>
        )}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="load" className="flex justify-center py-16 text-slate-500 text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Computing Q3 residual correlations…
          </motion.div>
        ) : data && tab === "pairs" ? (
          <motion.div key="pairs" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-900">
                  <tr>
                    {["Item A", "Skill A", "CEFR A", "Item B", "Skill B", "CEFR B", "Q3", "n", "Status"].map((h) => (
                      <th key={h} className="text-left text-slate-400 text-xs px-2 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayPairs.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-slate-500 text-sm">
                        <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-500" />
                        No dependent item pairs detected.
                      </td>
                    </tr>
                  )}
                  {displayPairs.map((p, idx) => (
                    <tr key={idx} className="border-t border-slate-700 hover:bg-slate-700/30">
                      <td className="px-2 py-1.5 text-slate-400 font-mono text-[10px]">{p.itemA.slice(-10)}</td>
                      <td className="px-2 py-1.5 font-medium text-xs" style={{ color: SKILL_COLORS[p.skillA] ?? "#94a3b8" }}>{p.skillA}</td>
                      <td className="px-2 py-1.5">
                        <span className="px-1 py-0.5 rounded text-[10px] text-white font-semibold" style={{ backgroundColor: CEFR_BG[p.cefrA] ?? "#475569" }}>
                          {p.cefrA.replace("_", "")}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-slate-400 font-mono text-[10px]">{p.itemB.slice(-10)}</td>
                      <td className="px-2 py-1.5 font-medium text-xs" style={{ color: SKILL_COLORS[p.skillB] ?? "#94a3b8" }}>{p.skillB}</td>
                      <td className="px-2 py-1.5">
                        <span className="px-1 py-0.5 rounded text-[10px] text-white font-semibold" style={{ backgroundColor: CEFR_BG[p.cefrB] ?? "#475569" }}>
                          {p.cefrB.replace("_", "")}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 font-mono text-xs font-semibold" style={{ color: q3Color(p.q3Stat) }}>
                        {p.q3Stat >= 0 ? "+" : ""}{p.q3Stat.toFixed(3)}
                      </td>
                      <td className="px-2 py-1.5 text-slate-500 text-xs">{p.nCommon}</td>
                      <td className="px-2 py-1.5">
                        {p.flagged
                          ? <span className="flex items-center gap-1 text-[10px] text-red-400"><AlertTriangle size={10} />Flagged</span>
                          : <span className="flex items-center gap-1 text-[10px] text-emerald-400"><CheckCircle2 size={10} />OK</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : data && tab === "heatmap" ? (
          <motion.div key="heatmap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-slate-300 mb-3">
              Q3 Matrix (top {data.heatmapItems.length} most-used items)
            </h3>
            {data.heatmapItems.length < 4 ? (
              <p className="text-slate-500 text-sm">Not enough overlapping item responses to draw heatmap.</p>
            ) : (
              <Q3Heatmap items={data.heatmapItems} matrix={data.heatmapMatrix} />
            )}
          </motion.div>
        ) : data && tab === "skill" ? (
          <motion.div key="skill" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Mean Q3 by Skill Pair</h3>
            <div className="space-y-3">
              {data.bySkillPair
                .sort((a, b) => b.meanQ3 - a.meanQ3)
                .map((sp) => (
                  <div key={sp.pair} className="flex items-center gap-3">
                    <span className="text-slate-400 text-xs w-40">{sp.pair}</span>
                    <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, sp.meanQ3 * 250)}%`,
                          backgroundColor: sp.meanQ3 > 0.4 ? "#ef4444" : sp.meanQ3 > 0.2 ? "#f59e0b" : "#06b6d4",
                        }}
                      />
                    </div>
                    <span className="text-slate-300 text-xs w-16">{sp.meanQ3.toFixed(3)}</span>
                    {sp.flaggedCount > 0 && (
                      <span className="text-red-400 text-xs">{sp.flaggedCount} flagged</span>
                    )}
                  </div>
                ))}
            </div>
          </motion.div>
        ) : data && tab === "histogram" ? (
          <motion.div key="histogram" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-slate-300 mb-1">Q3 Statistic Distribution</h3>
            <p className="text-slate-500 text-[10px] mb-4">Under local independence: Q3 ≈ N(−1/(n−1), ·) where n = test length. Values &gt; 0.2 suggest LD.</p>
            <Q3Histogram bins={data.q3Histogram} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
