import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, TrendingUp, AlertTriangle, CheckCircle2, BarChart3 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type DriftLevel = "STABLE" | "MINOR" | "MODERATE" | "CRITICAL";

interface DriftItem {
  id: string;
  skill: string;
  cefrLevel: string;
  currentA: number;   // discrimination
  currentB: number;   // difficulty
  currentPVal: number | null;
  expectedPVal: number | null;   // from IRT: P(theta=0)
  bDrift: number;      // |currentB - expectedB| proxy
  driftScore: number;  // 0–1 composite
  driftLevel: DriftLevel;
  responsesCount: number;
}

interface DriftPayload {
  totalItems: number;
  stableCount: number;
  minorCount: number;
  moderateCount: number;
  criticalCount: number;
  meanBDrift: number;
  items: DriftItem[];
  driftHistogram: { bin: number; count: number }[];
  bySkill: { skill: string; meanDrift: number; criticalCount: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DRIFT_COLORS: Record<DriftLevel, string> = {
  STABLE: "text-emerald-400",
  MINOR: "text-cyan-400",
  MODERATE: "text-amber-400",
  CRITICAL: "text-red-400",
};
const DRIFT_BG: Record<DriftLevel, string> = {
  STABLE: "bg-emerald-900/60",
  MINOR: "bg-cyan-900/60",
  MODERATE: "bg-amber-900/60",
  CRITICAL: "bg-red-900/60",
};

function driftBadge(level: DriftLevel) {
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${DRIFT_COLORS[level]} ${DRIFT_BG[level]}`}>
      {level}
    </span>
  );
}

const SKILL_LABELS: Record<string, string> = {
  GRAMMAR: "Grammar", VOCABULARY: "Vocabulary", READING: "Reading",
  LISTENING: "Listening", WRITING: "Writing", SPEAKING: "Speaking",
};
const SKILL_COLORS: Record<string, string> = {
  GRAMMAR: "#3b82f6", VOCABULARY: "#10b981", READING: "#f59e0b",
  LISTENING: "#8b5cf6", WRITING: "#ef4444", SPEAKING: "#f97316",
};
const CEFR_COLORS: Record<string, string> = {
  PRE_A1: "#475569", A1: "#3b82f6", A2: "#06b6d4",
  B1: "#10b981", B2: "#f59e0b", C1: "#f97316", C2: "#ef4444",
};

// ─── Drift histogram ──────────────────────────────────────────────────────────

const DriftHistogram: React.FC<{ bins: { bin: number; count: number }[] }> = ({ bins }) => {
  if (!bins.length) return null;
  const maxC = Math.max(...bins.map((b) => b.count), 1);
  return (
    <div className="flex items-end gap-0.5 h-28">
      {bins.map((b, i) => {
        const pct = b.count / maxC;
        const color = b.bin < 0.2 ? "#10b981" : b.bin < 0.4 ? "#f59e0b" : "#ef4444";
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5" title={`drift≈${b.bin.toFixed(2)}: ${b.count}`}>
            <div className="w-full rounded-t-sm" style={{ height: `${Math.max(2, pct * 108)}px`, backgroundColor: color }} />
            {i % 3 === 0 && <span className="text-[8px] text-slate-500">{b.bin.toFixed(1)}</span>}
          </div>
        );
      })}
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const ItemDriftPanel: React.FC = () => {
  const [data, setData] = useState<DriftPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"items" | "skill" | "histogram">("items");
  const [driftFilter, setDriftFilter] = useState<"ALL" | DriftLevel>("ALL");
  const [sortBy, setSortBy] = useState<"driftScore" | "bDrift">("driftScore");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/psychometrics/item-drift")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const displayItems = data
    ? data.items
        .filter((i) => driftFilter === "ALL" || i.driftLevel === driftFilter)
        .sort((a, b) => b[sortBy] - a[sortBy])
        .slice(0, 100)
    : [];

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp size={20} className="text-pink-400" />
            Item Parameter Drift Monitor
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Detects IRT parameter instability between calibration cycles (Stocking &amp; Lord, 1983)
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
            { label: "Items Monitored", value: data.totalItems.toLocaleString(), color: "text-pink-400" },
            { label: "Stable", value: data.stableCount.toString(), color: "text-emerald-400" },
            { label: "Minor Drift", value: data.minorCount.toString(), color: "text-cyan-400" },
            { label: "Moderate Drift", value: data.moderateCount.toString(), color: "text-amber-400" },
            { label: "Critical Drift", value: data.criticalCount.toString(), color: data.criticalCount > 0 ? "text-red-400" : "text-emerald-400" },
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

      {/* Tabs + filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["items", "skill", "histogram"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-pink-700 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
          >
            {t === "items" ? "Item Table" : t === "skill" ? "By Skill" : "Distribution"}
          </button>
        ))}
        {tab === "items" && (
          <>
            <select
              value={driftFilter}
              onChange={(e) => setDriftFilter(e.target.value as any)}
              className="ml-auto bg-slate-700 border border-slate-600 text-slate-200 text-xs rounded-lg px-2 py-1"
            >
              <option value="ALL">All</option>
              <option value="CRITICAL">Critical only</option>
              <option value="MODERATE">Moderate+</option>
              <option value="STABLE">Stable only</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-700 border border-slate-600 text-slate-200 text-xs rounded-lg px-2 py-1"
            >
              <option value="driftScore">Sort by drift score</option>
              <option value="bDrift">Sort by b-drift</option>
            </select>
          </>
        )}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="load" className="flex justify-center py-16 text-slate-500 text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Computing drift statistics…
          </motion.div>
        ) : data && tab === "items" ? (
          <motion.div key="items" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-900">
                  <tr>
                    {["Item ID", "Skill", "CEFR", "a (discrim)", "b (diff)", "Expected P(0)", "Observed p-val", "b-Drift", "Drift Score", "Level"].map((h) => (
                      <th key={h} className="text-left text-slate-400 text-xs px-2 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayItems.length === 0 && (
                    <tr>
                      <td colSpan={10} className="text-center py-8 text-slate-500 text-sm">
                        <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-500" />
                        No items match filter.
                      </td>
                    </tr>
                  )}
                  {displayItems.map((item) => (
                    <tr key={item.id} className="border-t border-slate-700 hover:bg-slate-700/30 transition-colors">
                      <td className="px-2 py-2 text-slate-400 font-mono text-[10px]">{item.id.slice(-10)}</td>
                      <td className="px-2 py-2 font-medium text-xs" style={{ color: SKILL_COLORS[item.skill] ?? "#94a3b8" }}>
                        {SKILL_LABELS[item.skill] ?? item.skill}
                      </td>
                      <td className="px-2 py-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-white" style={{ backgroundColor: CEFR_COLORS[item.cefrLevel] ?? "#475569" }}>
                          {item.cefrLevel.replace("_", "")}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-slate-300 text-xs">{item.currentA.toFixed(2)}</td>
                      <td className="px-2 py-2 text-slate-300 text-xs">{item.currentB.toFixed(2)}</td>
                      <td className="px-2 py-2 text-slate-400 text-xs">
                        {item.expectedPVal !== null ? item.expectedPVal.toFixed(3) : "—"}
                      </td>
                      <td className="px-2 py-2 text-slate-400 text-xs">
                        {item.currentPVal !== null ? item.currentPVal.toFixed(3) : "—"}
                      </td>
                      <td className={`px-2 py-2 font-semibold text-xs ${item.bDrift > 0.5 ? "text-red-400" : item.bDrift > 0.25 ? "text-amber-400" : "text-emerald-400"}`}>
                        {item.bDrift.toFixed(3)}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${item.driftScore > 0.6 ? "bg-red-500" : item.driftScore > 0.3 ? "bg-amber-500" : "bg-emerald-500"}`}
                              style={{ width: `${item.driftScore * 100}%` }}
                            />
                          </div>
                          <span className="text-slate-400 text-[10px]">{item.driftScore.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2">{driftBadge(item.driftLevel)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : data && tab === "skill" ? (
          <motion.div key="skill" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Mean Drift Score by Skill</h3>
            <div className="space-y-3">
              {data.bySkill.map((s) => (
                <div key={s.skill} className="flex items-center gap-3">
                  <span className="text-xs w-24 font-medium" style={{ color: SKILL_COLORS[s.skill] ?? "#94a3b8" }}>
                    {SKILL_LABELS[s.skill] ?? s.skill}
                  </span>
                  <div className="flex-1 h-4 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.meanDrift > 0.4 ? "bg-red-500" : s.meanDrift > 0.2 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(100, s.meanDrift * 200)}%` }}
                    />
                  </div>
                  <span className="text-slate-300 text-xs w-16">{s.meanDrift.toFixed(3)}</span>
                  <span className={`text-xs w-20 ${s.criticalCount > 0 ? "text-red-400 font-semibold" : "text-slate-500"}`}>
                    {s.criticalCount > 0 ? `${s.criticalCount} critical` : "OK"}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ) : data && tab === "histogram" ? (
          <motion.div key="hist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-1">Drift Score Distribution</h3>
            <p className="text-slate-500 text-xs mb-4">
              Composite drift = weighted combination of |Δb| (b-parameter shift) and |observed p-val − expected p-val|
            </p>
            <DriftHistogram bins={data.driftHistogram} />
            <div className="mt-3 flex gap-4 text-[11px] text-slate-400">
              {[
                { color: "bg-emerald-500", label: "0–0.2 Stable" },
                { color: "bg-amber-500", label: "0.2–0.4 Moderate" },
                { color: "bg-red-500", label: "> 0.4 Critical" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded ${l.color}`} />
                  <span>{l.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
