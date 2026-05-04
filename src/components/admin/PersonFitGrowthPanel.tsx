import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, TrendingUp, CheckCircle2, AlertTriangle, Users } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ThetaPoint {
  sessionDate: string;   // YYYY-MM-DD
  theta: number;
  sem: number;
  cefrLevel: string;
  sessionId: string;
}

interface CandidateGrowth {
  candidateId: string;
  nSessions: number;
  firstTheta: number;
  lastTheta: number;
  thetaGain: number;       // lastTheta - firstTheta
  thetaGainSE: number;     // sqrt(sem1^2 + semN^2) — propagated SEM of gain
  gainSignificant: boolean; // |gain| > 1.96 * thetaGainSE
  trajectory: "improving" | "stable" | "declining";
  sessions: ThetaPoint[];
  personFitLz: number;     // mean Lz* across sessions (>-2 = OK)
  fitFlag: boolean;        // personFitLz < -2
}

interface GrowthCohort {
  cohortLabel: string;     // e.g. "2 sessions", "3-4 sessions", "5+ sessions"
  nCandidates: number;
  meanGain: number;
  sdGain: number;
  pImproving: number;
  pDeclining: number;
}

interface GrowthPayload {
  totalCandidates: number;
  activeCandidates: number;   // ≥2 sessions
  meanGain: number;
  sdGain: number;
  pSignificantGain: number;
  cohorts: GrowthCohort[];
  topImprovers: CandidateGrowth[];
  candidates: CandidateGrowth[];
  gainDistribution: { bin: string; count: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CEFR_COLORS: Record<string, string> = {
  PRE_A1: "#64748b", A1: "#ef4444", A2: "#f97316",
  B1: "#eab308", B2: "#22c55e", C1: "#3b82f6", C2: "#8b5cf6",
};

function SparkLine({ sessions, width = 120, height = 32 }: { sessions: ThetaPoint[]; width?: number; height?: number }) {
  if (sessions.length < 2) return <div className="text-slate-600 text-xs">—</div>;
  const thetas = sessions.map((s) => s.theta);
  const minT = Math.min(...thetas), maxT = Math.max(...thetas);
  const range = Math.max(0.5, maxT - minT);
  const PAD = 4;
  const xs = (i: number) => PAD + (i / (sessions.length - 1)) * (width - PAD * 2);
  const ys = (t: number) => PAD + ((maxT - t) / range) * (height - PAD * 2);
  const points = sessions.map((s, i) => `${xs(i)},${ys(s.theta)}`).join(" ");
  const lastImprove = thetas[thetas.length - 1] > thetas[0];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
      <polyline
        points={points}
        fill="none"
        stroke={lastImprove ? "#22c55e" : "#ef4444"}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {sessions.map((s, i) => (
        <circle key={i} cx={xs(i)} cy={ys(s.theta)} r={2} fill={CEFR_COLORS[s.cefrLevel] ?? "#6366f1"}>
          <title>{`${s.sessionDate}: θ=${s.theta.toFixed(2)} ${s.cefrLevel}`}</title>
        </circle>
      ))}
    </svg>
  );
}

function GainDist({ bins }: { bins: { bin: string; count: number }[] }) {
  const max = Math.max(1, ...bins.map((b) => b.count));
  return (
    <div className="space-y-1">
      {bins.map((b) => {
        const g = parseFloat(b.bin);
        const color = g > 0.2 ? "#22c55e" : g < -0.2 ? "#ef4444" : "#6366f1";
        return (
          <div key={b.bin} className="flex items-center gap-2 text-xs">
            <span className="w-14 text-right font-mono text-slate-400">{b.bin}</span>
            <div className="flex-1 bg-slate-800 rounded-full h-4 overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(b.count / max) * 100}%`, background: color }} />
            </div>
            <span className="w-8 text-slate-300">{b.count}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

type GrowthTab = "overview" | "candidates" | "improvers" | "dist";
type SortKey = "thetaGain" | "nSessions" | "lastTheta" | "personFitLz";

export function PersonFitGrowthPanel() {
  const [data, setData] = useState<GrowthPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<GrowthTab>("overview");
  const [sortKey, setSortKey] = useState<SortKey>("thetaGain");
  const [minSessions, setMinSessions] = useState(2);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch("/api/psychometrics/person-fit-growth");
      if (!r.ok) throw new Error(await r.text());
      setData(await r.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const kpis = data ? [
    { label: "Active Candidates", value: data.activeCandidates, icon: <Users size={16} />, color: "#6366f1", fmt: String },
    { label: "Mean Gain (θ)", value: data.meanGain, icon: <TrendingUp size={16} />, color: data.meanGain > 0 ? "#22c55e" : "#ef4444", fmt: (v: number) => (v > 0 ? "+" : "") + v.toFixed(3) },
    { label: "SD Gain", value: data.sdGain, icon: <CheckCircle2 size={16} />, color: "#8b5cf6", fmt: (v: number) => v.toFixed(3) },
    { label: "Significant Gain", value: data.pSignificantGain, icon: <AlertTriangle size={16} />, color: data.pSignificantGain > 0.5 ? "#22c55e" : "#f59e0b", fmt: (v: number) => `${(v * 100).toFixed(1)}%` },
  ] : [];

  const filteredCandidates = data
    ? [...data.candidates]
        .filter((c) => c.nSessions >= minSessions)
        .sort((a, b) => {
          if (sortKey === "thetaGain") return b.thetaGain - a.thetaGain;
          if (sortKey === "nSessions") return b.nSessions - a.nSessions;
          if (sortKey === "lastTheta") return b.lastTheta - a.lastTheta;
          return a.personFitLz - b.personFitLz;
        })
        .slice(0, 100)
    : [];

  const TABS: { id: GrowthTab; label: string }[] = [
    { id: "overview", label: "Cohort Overview" },
    { id: "candidates", label: "All Candidates" },
    { id: "improvers", label: "Top Improvers" },
    { id: "dist", label: "Gain Distribution" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Person-Fit &amp; Growth Model</h2>
          <p className="text-slate-400 text-sm mt-1">
            Repeated-measure θ trajectories · gain significance (SE propagation) · Lz* person-fit
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">{error}</div>}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2" style={{ color: k.color }}>{k.icon}<span className="text-xs text-slate-400">{k.label}</span></div>
            <div className="text-2xl font-bold text-white">{(k.fmt as (v: any) => string)(k.value as any)}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/40 rounded-lg p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === t.id ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* COHORT OVERVIEW */}
        {activeTab === "overview" && (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <p className="text-slate-400 text-xs leading-relaxed">
              Candidates grouped by number of completed assessment sessions.
              Significant gain = |θ_N − θ_1| / √(SEM₁² + SEM_N²) &gt; 1.96.
            </p>
            {loading ? (
              <div className="text-center py-12 text-slate-400"><RefreshCw size={24} className="animate-spin mx-auto mb-3" />Loading…</div>
            ) : data ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {data.cohorts.map((c) => (
                  <div key={c.cohortLabel} className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                    <div className="text-sm font-medium text-white mb-3">{c.cohortLabel}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><div className="text-slate-500">N candidates</div><div className="text-white font-bold">{c.nCandidates}</div></div>
                      <div><div className="text-slate-500">Mean gain</div>
                        <div className="font-mono font-bold" style={{ color: c.meanGain > 0.1 ? "#22c55e" : c.meanGain < -0.1 ? "#ef4444" : "#94a3b8" }}>
                          {c.meanGain > 0 ? "+" : ""}{c.meanGain.toFixed(3)}
                        </div>
                      </div>
                      <div><div className="text-slate-500">SD gain</div><div className="text-white font-mono">{c.sdGain.toFixed(3)}</div></div>
                      <div><div className="text-slate-500">% improving</div><div className="text-emerald-400 font-mono">{(c.pImproving * 100).toFixed(1)}%</div></div>
                      <div className="col-span-2">
                        <div className="text-slate-500 mb-1">% declining</div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden flex">
                          <div className="h-full bg-emerald-500" style={{ width: `${c.pImproving * 100}%` }} />
                          <div className="h-full bg-red-500" style={{ width: `${c.pDeclining * 100}%` }} />
                        </div>
                        <div className="flex justify-between text-slate-500 mt-0.5">
                          <span>Improving {(c.pImproving * 100).toFixed(0)}%</span>
                          <span>Declining {(c.pDeclining * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </motion.div>
        )}

        {/* ALL CANDIDATES */}
        {activeTab === "candidates" && (
          <motion.div key="candidates" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-xs text-slate-400 flex items-center gap-2">
                Min sessions:
                <select
                  className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white focus:outline-none focus:border-indigo-500"
                  value={minSessions}
                  onChange={(e) => setMinSessions(Number(e.target.value))}
                >
                  {[2, 3, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <select
                className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
              >
                <option value="thetaGain">Sort: θ Gain (desc)</option>
                <option value="nSessions">Sort: Sessions (desc)</option>
                <option value="lastTheta">Sort: Last θ (desc)</option>
                <option value="personFitLz">Sort: Person-fit Lz* (asc)</option>
              </select>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-400"><RefreshCw size={24} className="animate-spin mx-auto mb-3" />Loading…</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-700/50">
                <table className="w-full text-xs text-slate-300">
                  <thead>
                    <tr className="bg-slate-800/80 text-slate-400">
                      <th className="px-3 py-2 text-left">Candidate</th>
                      <th className="px-3 py-2 text-right">Sessions</th>
                      <th className="px-3 py-2 text-right">θ first</th>
                      <th className="px-3 py-2 text-right">θ last</th>
                      <th className="px-3 py-2 text-right">Gain</th>
                      <th className="px-3 py-2 text-right">Lz*</th>
                      <th className="px-3 py-2 text-center">Trend</th>
                      <th className="px-3 py-2 text-center">Sig.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCandidates.map((c) => (
                      <tr key={c.candidateId} className={`border-t border-slate-700/30 hover:bg-slate-800/40 ${c.fitFlag ? "bg-amber-950/20" : ""}`}>
                        <td className="px-3 py-2 font-mono text-white">{c.candidateId.slice(-8)}</td>
                        <td className="px-3 py-2 text-right">{c.nSessions}</td>
                        <td className="px-3 py-2 text-right font-mono">{c.firstTheta.toFixed(3)}</td>
                        <td className="px-3 py-2 text-right font-mono">{c.lastTheta.toFixed(3)}</td>
                        <td className="px-3 py-2 text-right font-mono" style={{ color: c.thetaGain > 0.1 ? "#22c55e" : c.thetaGain < -0.1 ? "#ef4444" : "#94a3b8" }}>
                          {c.thetaGain > 0 ? "+" : ""}{c.thetaGain.toFixed(3)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono" style={{ color: c.fitFlag ? "#f59e0b" : "#94a3b8" }}>
                          {c.personFitLz.toFixed(2)}
                        </td>
                        <td className="px-3 py-2">
                          <SparkLine sessions={c.sessions} width={80} height={24} />
                        </td>
                        <td className="px-3 py-2 text-center">
                          {c.gainSignificant
                            ? <span className="px-1 py-0.5 rounded bg-emerald-900/50 text-emerald-300 text-xs">✓</span>
                            : <span className="text-slate-600 text-xs">—</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* TOP IMPROVERS */}
        {activeTab === "improvers" && (
          <motion.div key="improvers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
            <p className="text-slate-400 text-xs">Candidates with the largest statistically significant θ gains (|gain|/SE &gt; 1.96).</p>
            {data && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.topImprovers.map((c) => (
                  <div key={c.candidateId} className="bg-slate-900/50 rounded-xl p-4 border border-emerald-700/30">
                    <div className="flex items-center gap-3 mb-3">
                      <TrendingUp size={14} className="text-emerald-400" />
                      <span className="font-mono text-sm text-white">{c.candidateId.slice(-8)}</span>
                      <span className="ml-auto text-emerald-400 font-mono font-bold text-sm">
                        +{c.thetaGain.toFixed(3)} θ
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 grid grid-cols-3 gap-2 text-xs">
                        <div><div className="text-slate-500">Sessions</div><div className="text-white">{c.nSessions}</div></div>
                        <div><div className="text-slate-500">θ: {c.firstTheta.toFixed(2)} → {c.lastTheta.toFixed(2)}</div></div>
                        <div><div className="text-slate-500">Lz*</div><div className="text-white">{c.personFitLz.toFixed(2)}</div></div>
                      </div>
                      <SparkLine sessions={c.sessions} width={100} height={30} />
                    </div>
                  </div>
                ))}
                {data.topImprovers.length === 0 && (
                  <div className="col-span-2 text-center py-8 text-slate-500">No candidates with significant gain yet.</div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* GAIN DISTRIBUTION */}
        {activeTab === "dist" && (
          <motion.div key="dist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <p className="text-slate-400 text-xs">
              Distribution of θ gains (last − first session). Positive values indicate learning;
              negative may indicate regression or measurement variability.
            </p>
            {data && <GainDist bins={data.gainDistribution} />}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
