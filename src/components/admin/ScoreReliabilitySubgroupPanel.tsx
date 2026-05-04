import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, BarChart3, CheckCircle2, AlertTriangle, Users } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SubgroupReliability {
  groupVar: string;      // "cefrLevel" | "skill" | "nItems"
  groupLabel: string;
  n: number;
  meanTheta: number;
  sdTheta: number;
  semMean: number;
  // Empirical reliability: r_XX = 1 - (MSE / Var_theta)
  reliability: number;
  // Coefficient omega proxy (SEM-based)
  omega: number;
  // SEM target: 0.35
  precisionOK: boolean;
}

interface ReliabilityPayload {
  overallN: number;
  overallReliability: number;
  overallMeanSEM: number;
  byCefr: SubgroupReliability[];
  bySkill: SubgroupReliability[];
  byNItemsBin: SubgroupReliability[];
  semDistribution: { bin: string; count: number; pct: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CEFR_ORDER = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];

const SKILL_COLORS: Record<string, string> = {
  GRAMMAR: "#6366f1",
  VOCABULARY: "#8b5cf6",
  READING: "#3b82f6",
  LISTENING: "#06b6d4",
  WRITING: "#10b981",
  SPEAKING: "#f59e0b",
};

function RelBar({ value, label }: { value: number; label: string }) {
  const pct = Math.min(100, value * 100);
  const color = value >= 0.85 ? "#10b981" : value >= 0.70 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-24 truncate text-slate-400">{label}</span>
      <div className="flex-1 bg-slate-800 rounded-full h-2">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-10 text-right font-mono" style={{ color }}>{value.toFixed(3)}</span>
    </div>
  );
}

function SEMDistChart({ data }: { data: { bin: string; count: number; pct: number }[] }) {
  const maxCount = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <div className="text-xs text-slate-400 mb-3">SEM distribution across sessions</div>
      <div className="flex items-end gap-1 h-32">
        {data.map((d) => {
          const h = (d.count / maxCount) * 100;
          const color = d.bin < "0.35" ? "#10b981" : "#ef4444";
          return (
            <div key={d.bin} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t transition-all" style={{ height: `${h}%`, background: color, minHeight: d.count > 0 ? 2 : 0 }} />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-1">
        {data.map((d) => (
          <div key={d.bin} className="flex-1 text-center text-slate-500" style={{ fontSize: 9 }}>{d.bin}</div>
        ))}
      </div>
      <div className="flex gap-4 mt-2 text-xs text-slate-400">
        <span><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1" />≤0.35 (target)</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />&gt;0.35</span>
      </div>
    </div>
  );
}

function SubgroupTable({ rows, groupLabel, colorMap }: { rows: SubgroupReliability[]; groupLabel: string; colorMap?: Record<string, string> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-slate-300">
        <thead>
          <tr className="text-slate-400 border-b border-slate-700">
            <th className="text-left py-2 pr-4">{groupLabel}</th>
            <th className="text-right py-2 pr-4">N</th>
            <th className="text-right py-2 pr-4">Mean θ</th>
            <th className="text-right py-2 pr-4">SD θ</th>
            <th className="text-right py-2 pr-4">Mean SEM</th>
            <th className="text-right py-2 pr-4">Reliability</th>
            <th className="text-right py-2 pr-4">Omega</th>
            <th className="text-center py-2">Precision</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.groupLabel} className="border-b border-slate-800 hover:bg-slate-800/50">
              <td className="py-2 pr-4">
                {colorMap ? (
                  <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: (colorMap[row.groupLabel] ?? "#64748b") + "22", color: colorMap[row.groupLabel] ?? "#94a3b8" }}>
                    {row.groupLabel}
                  </span>
                ) : row.groupLabel}
              </td>
              <td className="py-2 pr-4 text-right">{row.n}</td>
              <td className="py-2 pr-4 text-right font-mono">{row.meanTheta.toFixed(2)}</td>
              <td className="py-2 pr-4 text-right font-mono">{row.sdTheta.toFixed(2)}</td>
              <td className={`py-2 pr-4 text-right font-mono ${row.semMean <= 0.35 ? "text-emerald-400" : "text-red-400"}`}>{row.semMean.toFixed(3)}</td>
              <td className={`py-2 pr-4 text-right font-mono font-semibold ${row.reliability >= 0.85 ? "text-emerald-400" : row.reliability >= 0.70 ? "text-amber-400" : "text-red-400"}`}>
                {row.reliability.toFixed(3)}
              </td>
              <td className={`py-2 pr-4 text-right font-mono ${row.omega >= 0.85 ? "text-emerald-400" : "text-slate-300"}`}>{row.omega.toFixed(3)}</td>
              <td className="py-2 text-center">{row.precisionOK ? <CheckCircle2 size={14} className="inline text-emerald-400" /> : <AlertTriangle size={14} className="inline text-amber-400" />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ScoreReliabilitySubgroupPanel() {
  const [data, setData] = useState<ReliabilityPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"cefr" | "skill" | "nitems" | "distribution">("cefr");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/psychometrics/reliability-subgroup");
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
        { label: "Sessions", value: data.overallN, icon: <Users size={16} />, color: "#6366f1", fmt: (v: number) => v.toLocaleString() },
        { label: "Overall Reliability", value: data.overallReliability, icon: <BarChart3 size={16} />, color: data.overallReliability >= 0.85 ? "#10b981" : "#f59e0b", fmt: (v: number) => v.toFixed(3) },
        { label: "Mean SEM", value: data.overallMeanSEM, icon: <CheckCircle2 size={16} />, color: data.overallMeanSEM <= 0.35 ? "#10b981" : "#ef4444", fmt: (v: number) => v.toFixed(3) },
        { label: "CEFR Groups", value: data.byCefr.length, icon: <AlertTriangle size={16} />, color: "#8b5cf6", fmt: (v: number) => v.toString() },
      ]
    : [];

  const tabs = [
    { id: "cefr" as const, label: "By CEFR" },
    { id: "skill" as const, label: "By Skill" },
    { id: "nitems" as const, label: "By N Items" },
    { id: "distribution" as const, label: "SEM Distribution" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Score Reliability by Subgroup</h2>
          <p className="text-xs text-slate-400 mt-0.5">Empirical reliability (r_XX) and omega coefficients per CEFR level, skill, and test length bin</p>
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

      {/* Overall reliability bar */}
      {data && (
        <div className="bg-slate-800 rounded-xl p-4 space-y-2">
          <div className="text-xs text-slate-400 font-medium mb-2">Reliability overview</div>
          {data.byCefr.slice().sort((a, b) => CEFR_ORDER.indexOf(a.groupLabel) - CEFR_ORDER.indexOf(b.groupLabel)).map((row) => (
            <RelBar key={row.groupLabel} value={row.reliability} label={row.groupLabel} />
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

        {!loading && activeTab === "cefr" && data && (
          <motion.div key="cefr" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <SubgroupTable rows={data.byCefr.slice().sort((a, b) => CEFR_ORDER.indexOf(a.groupLabel) - CEFR_ORDER.indexOf(b.groupLabel))} groupLabel="CEFR Level" />
          </motion.div>
        )}

        {!loading && activeTab === "skill" && data && (
          <motion.div key="skill" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <SubgroupTable rows={data.bySkill} groupLabel="Skill" colorMap={SKILL_COLORS} />
          </motion.div>
        )}

        {!loading && activeTab === "nitems" && data && (
          <motion.div key="nitems" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <SubgroupTable rows={data.byNItemsBin} groupLabel="N Items (bin)" />
          </motion.div>
        )}

        {!loading && activeTab === "distribution" && data && (
          <motion.div key="distribution" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <SEMDistChart data={data.semDistribution} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
