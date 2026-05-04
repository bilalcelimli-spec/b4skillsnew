import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, Layers, CheckCircle2, AlertTriangle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConstraintStatus {
  skill: string;
  minCount: number;
  maxCount: number;
  actualCount: number;
  satisfied: boolean;
  pctSatisfied: number;   // sessions where constraint was met
}

interface SkillBalance {
  skill: string;
  meanItemsPerTest: number;
  sdItemsPerTest: number;
  pctAtMin: number;        // % sessions that hit the minimum
}

interface ShadowTestSnapshot {
  totalSessions: number;
  constraintsSatisfied: number;
  totalConstraints: number;
  overallSatisfactionRate: number;
  blueprintConstraints: ConstraintStatus[];
  skillBalance: SkillBalance[];
  cefrBalance: { level: string; meanCount: number; pct: number }[];
  violationRate: number;
  recentViolations: { sessionId: string; skill: string; actual: number; min: number; cefrLevel: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Radial gauge ─────────────────────────────────────────────────────────────

const SatisfactionGauge: React.FC<{ pct: number; label: string }> = ({ pct, label }) => {
  const r = 36, cx = 44, cy = 44, sw = 8;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 95 ? "#10b981" : pct >= 80 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={88} height={88} viewBox="0 0 88 88">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={sw} />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth={sw}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <text x={cx} y={cy + 5} textAnchor="middle" fill={color} fontSize={14} fontWeight="bold">
          {Math.round(pct)}%
        </text>
      </svg>
      <p className="text-xs text-slate-400 text-center w-20">{label}</p>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const ShadowTestPanel: React.FC = () => {
  const [data, setData] = useState<ShadowTestSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"constraints" | "balance" | "violations">("constraints");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/psychometrics/shadow-test")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Layers size={20} className="text-indigo-400" />
            Shadow Test Blueprint Monitor
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Content constraint satisfaction across CAT sessions (van der Linden 2005)
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

      {/* KPI + gauge row */}
      {data && (
        <div className="flex items-start gap-6">
          {/* Gauge */}
          <div className="flex gap-4">
            <SatisfactionGauge pct={data.overallSatisfactionRate * 100} label="Constraint Satisfaction" />
            <SatisfactionGauge pct={(1 - data.violationRate) * 100} label="Violation-Free Sessions" />
          </div>
          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-4 flex-1">
            {[
              { label: "Sessions", value: data.totalSessions.toLocaleString(), color: "text-indigo-400" },
              {
                label: "Constraints Met",
                value: `${data.constraintsSatisfied}/${data.totalConstraints}`,
                color: data.constraintsSatisfied === data.totalConstraints ? "text-emerald-400" : "text-amber-400",
              },
              {
                label: "Violation Rate",
                value: `${(data.violationRate * 100).toFixed(1)}%`,
                color: data.violationRate < 0.05 ? "text-emerald-400" : data.violationRate < 0.10 ? "text-amber-400" : "text-red-400",
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
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {(["constraints", "balance", "violations"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-indigo-700 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
          >
            {t === "constraints" ? "Blueprint Constraints" : t === "balance" ? "Skill Balance" : "Violations"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="load" className="flex justify-center py-16 text-slate-500 text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Loading shadow-test statistics…
          </motion.div>
        ) : data && tab === "constraints" ? (
          <motion.div key="con" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-900">
                  <tr>
                    {["Skill", "Min", "Max", "Actual (mean)", "Satisfaction %", "Status"].map((h) => (
                      <th key={h} className="text-left text-slate-400 text-xs px-3 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.blueprintConstraints.map((c) => (
                    <tr key={c.skill} className="border-t border-slate-700 hover:bg-slate-700/30 transition-colors">
                      <td className="px-3 py-2 font-semibold" style={{ color: SKILL_COLORS[c.skill] ?? "#94a3b8" }}>
                        {SKILL_LABELS[c.skill] ?? c.skill}
                      </td>
                      <td className="px-3 py-2 text-slate-300">{c.minCount}</td>
                      <td className="px-3 py-2 text-slate-300">{c.maxCount}</td>
                      <td className="px-3 py-2 text-slate-200 font-semibold">{c.actualCount.toFixed(1)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${c.pctSatisfied >= 95 ? "bg-emerald-500" : c.pctSatisfied >= 80 ? "bg-amber-500" : "bg-red-500"}`}
                              style={{ width: `${c.pctSatisfied}%` }}
                            />
                          </div>
                          <span className="text-slate-300 text-xs">{c.pctSatisfied.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        {c.satisfied
                          ? <CheckCircle2 size={14} className="text-emerald-400" />
                          : <AlertTriangle size={14} className="text-amber-400" />}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : data && tab === "balance" ? (
          <motion.div key="bal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Skill balance bars */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Mean Items Per Test by Skill</h3>
              <div className="space-y-3">
                {data.skillBalance.map((s) => {
                  const pct = Math.min(100, (s.meanItemsPerTest / 5) * 100);
                  return (
                    <div key={s.skill} className="flex items-center gap-3">
                      <span className="text-xs w-24 font-medium" style={{ color: SKILL_COLORS[s.skill] ?? "#94a3b8" }}>
                        {SKILL_LABELS[s.skill] ?? s.skill}
                      </span>
                      <div className="flex-1 h-4 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: SKILL_COLORS[s.skill] ?? "#94a3b8", opacity: 0.8 }}
                        />
                      </div>
                      <span className="text-slate-300 text-xs w-20">
                        {s.meanItemsPerTest.toFixed(1)} ± {s.sdItemsPerTest.toFixed(1)}
                      </span>
                      <span className="text-slate-400 text-xs w-16">{s.pctAtMin.toFixed(0)}% at min</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* CEFR balance */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">CEFR Level Distribution Across Tests</h3>
              <div className="flex items-end gap-2 h-24">
                {data.cefrBalance.map((c) => (
                  <div key={c.level} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-sm"
                      style={{ height: `${Math.max(4, c.pct * 80)}px`, backgroundColor: CEFR_COLORS[c.level] ?? "#475569" }}
                      title={`${c.level}: ${c.meanCount.toFixed(1)} items/test`}
                    />
                    <span className="text-[9px] text-slate-400">{c.level.replace("_", "")}</span>
                    <span className="text-[9px] text-slate-500">{c.meanCount.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : data && tab === "violations" ? (
          <motion.div key="vio" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {data.recentViolations.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500" />
                No blueprint violations detected.
              </div>
            ) : (
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900">
                    <tr>
                      {["Session", "CEFR", "Skill", "Actual", "Min Required", "Shortfall"].map((h) => (
                        <th key={h} className="text-left text-slate-400 text-xs px-3 py-2 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentViolations.map((v, i) => (
                      <tr key={i} className="border-t border-slate-700 hover:bg-slate-700/30 transition-colors">
                        <td className="px-3 py-2 text-slate-400 font-mono text-xs">{v.sessionId.slice(-10)}</td>
                        <td className="px-3 py-2">
                          <span className="px-1.5 py-0.5 rounded text-xs font-semibold text-white" style={{ backgroundColor: CEFR_COLORS[v.cefrLevel] ?? "#475569" }}>
                            {v.cefrLevel.replace("_", "")}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-semibold" style={{ color: SKILL_COLORS[v.skill] ?? "#94a3b8" }}>
                          {SKILL_LABELS[v.skill] ?? v.skill}
                        </td>
                        <td className="px-3 py-2 text-red-400 font-semibold">{v.actual}</td>
                        <td className="px-3 py-2 text-slate-300">{v.min}</td>
                        <td className="px-3 py-2 text-red-400 font-semibold">−{v.min - v.actual}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
