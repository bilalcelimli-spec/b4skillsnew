import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, BarChart3, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SkillSubscale {
  skill: string;
  nItems: number;
  nSessions: number;
  meanTheta: number;
  sdTheta: number;
  sem: number;
  reliability: number;        // Cronbach α proxy via IRT info
  cefrDistribution: { cefrLevel: string; count: number; pct: number }[];
}

interface CompositeScore {
  sessionId: string;
  candidateId: string;
  cefrLevel: string;
  compositeTheta: number;
  compositeCefr: string;
  subscales: { skill: string; theta: number | null; nItems: number }[];
  totalItems: number;
  completedAt: string;
}

interface SubscalePayload {
  totalSessions: number;
  skillsPresent: string[];
  subscales: SkillSubscale[];
  recentComposites: CompositeScore[];
  correlationMatrix: { skillA: string; skillB: string; r: number }[];
  intercorrelationMean: number;
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

function corrColor(r: number): string {
  const abs = Math.abs(r);
  if (abs > 0.7) return "#10b981";
  if (abs > 0.4) return "#f59e0b";
  return "#ef4444";
}

// ─── Correlation Matrix ───────────────────────────────────────────────────────

const CorrMatrix: React.FC<{ skills: string[]; pairs: { skillA: string; skillB: string; r: number }[] }> = ({ skills, pairs }) => {
  const getR = (a: string, b: string) => {
    if (a === b) return 1;
    return pairs.find((p) => (p.skillA === a && p.skillB === b) || (p.skillA === b && p.skillB === a))?.r ?? NaN;
  };
  return (
    <div className="overflow-auto">
      <table className="text-xs border-collapse">
        <thead>
          <tr>
            <th className="px-2 py-1 text-slate-400"></th>
            {skills.map((s) => (
              <th key={s} className="px-2 py-1 text-center">
                <span className="text-[10px] font-semibold" style={{ color: SKILL_COLORS[s] ?? "#94a3b8" }}>{s.slice(0, 4)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {skills.map((rowSkill) => (
            <tr key={rowSkill}>
              <td className="px-2 py-1 font-semibold text-[10px]" style={{ color: SKILL_COLORS[rowSkill] ?? "#94a3b8" }}>{rowSkill.slice(0, 4)}</td>
              {skills.map((colSkill) => {
                const r = getR(rowSkill, colSkill);
                const isDiag = rowSkill === colSkill;
                return (
                  <td key={colSkill} className="px-2 py-1 text-center">
                    <div className={`w-14 h-8 flex items-center justify-center rounded text-[10px] font-mono font-semibold ${isDiag ? "bg-slate-700 text-slate-400" : "bg-slate-900"}`}
                      style={isDiag ? {} : { color: corrColor(r) }}>
                      {isDiag ? "1.00" : isNaN(r) ? "—" : r.toFixed(2)}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const SubscaleCompositeScoringPanel: React.FC = () => {
  const [data, setData] = useState<SubscalePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"subscales" | "composites" | "correlations">("subscales");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/psychometrics/subscale-composite")
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
            <BarChart3 size={20} className="text-violet-400" />
            Subscale &amp; Composite Scoring
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Per-skill subscale θ estimates, composite scores, and inter-scale correlations
          </p>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && <div className="bg-red-900/40 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>}

      {/* KPI row */}
      {data && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Sessions Analysed", value: data.totalSessions.toLocaleString(), color: "text-violet-400" },
            { label: "Skills Present", value: data.skillsPresent.length.toString(), color: "text-blue-400" },
            { label: "Mean Intercorr.", value: data.intercorrelationMean.toFixed(3), color: data.intercorrelationMean > 0.7 ? "text-emerald-400" : data.intercorrelationMean > 0.4 ? "text-amber-400" : "text-red-400" },
            { label: "Subscales", value: data.subscales.length.toString(), color: "text-slate-300" },
          ].map((k) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800 border border-slate-700 rounded-xl p-3">
              <p className="text-slate-400 text-xs mb-1">{k.label}</p>
              <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {(["subscales", "composites", "correlations"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-violet-700 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
            {t === "subscales" ? "Subscale Stats" : t === "composites" ? "Composite Scores" : "Intercorrelations"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="load" className="flex justify-center py-16 text-slate-500 text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Computing subscale statistics…
          </motion.div>
        ) : data && tab === "subscales" ? (
          <motion.div key="subscales" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {data.subscales.map((s) => (
              <div key={s.skill} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-sm font-bold" style={{ color: SKILL_COLORS[s.skill] ?? "#94a3b8" }}>{s.skill}</h3>
                  <span className="text-slate-500 text-xs">{s.nItems} items · {s.nSessions} sessions</span>
                  <span className={`ml-auto text-xs font-semibold ${s.reliability >= 0.8 ? "text-emerald-400" : s.reliability >= 0.7 ? "text-amber-400" : "text-red-400"}`}>
                    α ≈ {s.reliability.toFixed(3)}
                  </span>
                </div>
                {/* Stat row */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { l: "Mean θ", v: s.meanTheta.toFixed(2) },
                    { l: "SD θ", v: s.sdTheta.toFixed(2) },
                    { l: "SEM", v: s.sem.toFixed(3) },
                    { l: "Reliability", v: s.reliability.toFixed(3) },
                  ].map((stat) => (
                    <div key={stat.l} className="bg-slate-900 rounded-lg p-2 text-center">
                      <p className="text-[10px] text-slate-500 mb-0.5">{stat.l}</p>
                      <p className="text-xs font-bold text-slate-200">{stat.v}</p>
                    </div>
                  ))}
                </div>
                {/* CEFR distribution */}
                <div className="flex gap-1 flex-wrap">
                  {s.cefrDistribution.map((c) => (
                    <div key={c.cefrLevel} className="flex items-center gap-1">
                      <span className="px-1.5 py-0.5 rounded text-[9px] text-white font-semibold"
                        style={{ backgroundColor: CEFR_BG[c.cefrLevel] ?? "#475569" }}>
                        {c.cefrLevel.replace("_", "")}
                      </span>
                      <span className="text-[10px] text-slate-400">{c.count} ({c.pct.toFixed(0)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {data.subscales.length === 0 && (
              <div className="text-center py-12 text-slate-500">No subscale data available.</div>
            )}
          </motion.div>
        ) : data && tab === "composites" ? (
          <motion.div key="composites" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="text-left text-slate-400 text-xs px-2 py-2">Session</th>
                    <th className="text-left text-slate-400 text-xs px-2 py-2">CEFR</th>
                    <th className="text-left text-slate-400 text-xs px-2 py-2">Composite θ</th>
                    <th className="text-left text-slate-400 text-xs px-2 py-2">Composite CEFR</th>
                    {data.skillsPresent.map((sk) => (
                      <th key={sk} className="text-left text-slate-400 text-[10px] px-2 py-2"
                        style={{ color: SKILL_COLORS[sk] ?? "#94a3b8" }}>{sk.slice(0, 4)}</th>
                    ))}
                    <th className="text-left text-slate-400 text-xs px-2 py-2">Items</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentComposites.slice(0, 80).map((c) => (
                    <tr key={c.sessionId} className="border-t border-slate-700 hover:bg-slate-700/30">
                      <td className="px-2 py-1.5 text-slate-400 font-mono text-[10px]">{c.sessionId.slice(-10)}</td>
                      <td className="px-2 py-1.5">
                        <span className="px-1 py-0.5 rounded text-[10px] text-white font-semibold"
                          style={{ backgroundColor: CEFR_BG[c.cefrLevel] ?? "#475569" }}>
                          {c.cefrLevel.replace("_", "")}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-slate-300 text-xs font-mono">{c.compositeTheta.toFixed(2)}</td>
                      <td className="px-2 py-1.5">
                        <span className="px-1 py-0.5 rounded text-[10px] text-white font-semibold"
                          style={{ backgroundColor: CEFR_BG[c.compositeCefr] ?? "#475569" }}>
                          {c.compositeCefr.replace("_", "")}
                        </span>
                      </td>
                      {data.skillsPresent.map((sk) => {
                        const sub = c.subscales.find((s) => s.skill === sk);
                        return (
                          <td key={sk} className="px-2 py-1.5 text-slate-400 text-xs font-mono">
                            {sub?.theta !== null && sub?.theta !== undefined ? sub.theta.toFixed(2) : "—"}
                          </td>
                        );
                      })}
                      <td className="px-2 py-1.5 text-slate-500 text-xs">{c.totalItems}</td>
                    </tr>
                  ))}
                  {data.recentComposites.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-slate-500">No completed sessions.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : data && tab === "correlations" ? (
          <motion.div key="correlations" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-1">Subscale Intercorrelation Matrix</h3>
            <p className="text-[11px] text-slate-500 mb-4">
              Pearson r of per-session θ estimates across skills. High correlations (&gt;0.7) support a general proficiency factor. Low values suggest distinct constructs.
            </p>
            {data.skillsPresent.length < 2 ? (
              <p className="text-slate-500 text-sm">Need ≥2 skills with sessions to compute correlations.</p>
            ) : (
              <CorrMatrix skills={data.skillsPresent} pairs={data.correlationMatrix} />
            )}
            <div className="flex gap-4 mt-4 text-[11px] text-slate-400">
              {[{ color: "text-emerald-400", label: "r > 0.7 — high convergent validity" }, { color: "text-amber-400", label: "r 0.4–0.7 — moderate" }, { color: "text-red-400", label: "r < 0.4 — weak / distinct" }].map((l) => (
                <div key={l.label} className={`flex items-center gap-1 ${l.color}`}>● <span className="text-slate-400">{l.label}</span></div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
