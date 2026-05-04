import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, FileText, CheckCircle2, TrendingUp, Users } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CefrBand {
  cefrLevel: string;
  n: number;
  pct: number;
  meanTheta: number;
  meanTScore: number;
  completionRate: number;
}

interface MonthlyTrend {
  month: string;
  nSessions: number;
  nCompleted: number;
  meanTheta: number;
  completionRate: number;
}

interface SkillBreakdown {
  skill: string;
  nSessions: number;
  meanTheta: number;
  sdTheta: number;
  cefrMode: string;
}

interface TopItem {
  itemId: string;
  itemLabel: string;
  skill: string;
  cefrLevel: string;
  difficulty: number;
  nResponses: number;
  pCorrect: number;
  discrimination: number;
}

interface ScoreReportPayload {
  totalSessions: number;
  completedSessions: number;
  completionRate: number;
  meanTheta: number;
  cefrDistribution: CefrBand[];
  monthlyTrend: MonthlyTrend[];
  skillBreakdown: SkillBreakdown[];
  topItems: TopItem[];
  bottomItems: TopItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CEFR_COLORS: Record<string, string> = {
  PRE_A1: "#64748b", A1: "#ef4444", A2: "#f97316",
  B1: "#eab308", B2: "#22c55e", C1: "#3b82f6", C2: "#8b5cf6",
};

const SKILL_COLORS: Record<string, string> = {
  GRAMMAR: "#6366f1", VOCABULARY: "#8b5cf6", READING: "#3b82f6",
  LISTENING: "#06b6d4", WRITING: "#10b981", SPEAKING: "#f59e0b",
};

const CEFR_ORDER = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];

function CefrDistChart({ bands }: { bands: CefrBand[] }) {
  const maxPct = Math.max(1, ...bands.map((b) => b.pct));
  const ordered = CEFR_ORDER.map((lvl) => bands.find((b) => b.cefrLevel === lvl)).filter(Boolean) as CefrBand[];
  return (
    <div className="space-y-2">
      {ordered.map((b) => (
        <div key={b.cefrLevel} className="flex items-center gap-3 text-xs">
          <span className="w-14 font-medium text-right" style={{ color: CEFR_COLORS[b.cefrLevel] ?? "#94a3b8" }}>{b.cefrLevel}</span>
          <div className="flex-1 bg-slate-800 rounded-full h-5 overflow-hidden">
            <div
              className="h-full rounded-full flex items-center px-2 text-white font-medium transition-all"
              style={{ width: `${(b.pct / maxPct) * 100}%`, background: CEFR_COLORS[b.cefrLevel] ?? "#6366f1", minWidth: b.n > 0 ? "2rem" : 0 }}
            >
              {b.pct >= 5 ? `${b.pct.toFixed(1)}%` : ""}
            </div>
          </div>
          <span className="w-12 text-right text-slate-400">{b.n}</span>
        </div>
      ))}
    </div>
  );
}

function TrendChart({ data }: { data: MonthlyTrend[] }) {
  if (data.length < 2) return <div className="text-slate-500 text-xs text-center py-8">Not enough trend data</div>;
  const W = 420, H = 130, PAD = 32;
  const maxN = Math.max(1, ...data.map((d) => d.nCompleted));
  const xs = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const ys = (v: number) => PAD + ((maxN - v) / maxN) * (H - PAD * 2);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 130 }}>
      <defs>
        <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <polygon
        fill="url(#completedGrad)"
        points={`${xs(0)},${H - PAD} ${data.map((d, i) => `${xs(i)},${ys(d.nCompleted)}`).join(" ")} ${xs(data.length - 1)},${H - PAD}`}
      />
      {/* Line */}
      <polyline
        fill="none"
        stroke="#6366f1"
        strokeWidth={2}
        points={data.map((d, i) => `${xs(i)},${ys(d.nCompleted)}`).join(" ")}
      />
      {/* Dots */}
      {data.map((d, i) => (
        <circle key={i} cx={xs(i)} cy={ys(d.nCompleted)} r={3} fill="#6366f1">
          <title>{`${d.month}: ${d.nCompleted} completed`}</title>
        </circle>
      ))}
      {/* X-axis labels */}
      {data.map((d, i) =>
        i % Math.max(1, Math.floor(data.length / 6)) === 0 ? (
          <text key={`lbl-${i}`} x={xs(i)} y={H - 4} fontSize={8} fill="#64748b" textAnchor="middle">
            {d.month}
          </text>
        ) : null
      )}
      <text x={4} y={PAD} fontSize={8} fill="#6366f1">N</text>
    </svg>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

type ReportTab = "overview" | "trend" | "skills" | "items";

export function ScoreReportingAnalyticsPanel() {
  const [data, setData] = useState<ScoreReportPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ReportTab>("overview");
  const [showBottom, setShowBottom] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch("/api/psychometrics/score-reporting");
      if (!r.ok) throw new Error(await r.text());
      setData(await r.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const kpis = data ? [
    { label: "Total Sessions", value: data.totalSessions, icon: <Users size={16} />, color: "#6366f1", fmt: String },
    { label: "Completed", value: data.completedSessions, icon: <CheckCircle2 size={16} />, color: "#10b981", fmt: String },
    { label: "Completion Rate", value: data.completionRate, icon: <FileText size={16} />, color: data.completionRate >= 80 ? "#10b981" : data.completionRate >= 60 ? "#f59e0b" : "#ef4444", fmt: (v: number) => `${v.toFixed(1)}%` },
    { label: "Mean θ (CEFR)", value: data.meanTheta, icon: <TrendingUp size={16} />, color: "#8b5cf6", fmt: (v: number) => v.toFixed(3) },
  ] : [];

  const TABS: { id: ReportTab; label: string }[] = [
    { id: "overview", label: "CEFR Overview" },
    { id: "trend", label: "Monthly Trend" },
    { id: "skills", label: "By Skill" },
    { id: "items", label: "Top/Bottom Items" },
  ];

  const displayItems = data ? (showBottom ? data.bottomItems : data.topItems) : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Score Reporting Analytics</h2>
          <p className="text-slate-400 text-sm mt-1">
            CEFR distribution · completion trends · skill breakdown · item performance
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
        {/* CEFR OVERVIEW */}
        {activeTab === "overview" && (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            {loading ? (
              <div className="text-center py-12 text-slate-400"><RefreshCw size={24} className="animate-spin mx-auto mb-3" />Loading…</div>
            ) : data ? (
              <>
                <CefrDistChart bands={data.cefrDistribution} />
                <div className="overflow-x-auto rounded-xl border border-slate-700/50">
                  <table className="w-full text-xs text-slate-300">
                    <thead>
                      <tr className="bg-slate-800/80 text-slate-400">
                        <th className="px-3 py-2 text-left">Level</th>
                        <th className="px-3 py-2 text-right">N</th>
                        <th className="px-3 py-2 text-right">%</th>
                        <th className="px-3 py-2 text-right">Mean θ</th>
                        <th className="px-3 py-2 text-right">Mean T-Score</th>
                        <th className="px-3 py-2 text-right">Completion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CEFR_ORDER.map((lvl) => {
                        const b = data.cefrDistribution.find((x) => x.cefrLevel === lvl);
                        if (!b) return null;
                        return (
                          <tr key={lvl} className="border-t border-slate-700/30 hover:bg-slate-800/40">
                            <td className="px-3 py-2 font-medium" style={{ color: CEFR_COLORS[lvl] }}>{lvl}</td>
                            <td className="px-3 py-2 text-right">{b.n}</td>
                            <td className="px-3 py-2 text-right">{b.pct.toFixed(1)}%</td>
                            <td className="px-3 py-2 text-right font-mono">{b.meanTheta.toFixed(3)}</td>
                            <td className="px-3 py-2 text-right font-mono">{b.meanTScore.toFixed(1)}</td>
                            <td className="px-3 py-2 text-right">
                              <span style={{ color: b.completionRate >= 80 ? "#10b981" : b.completionRate >= 60 ? "#f59e0b" : "#ef4444" }}>
                                {b.completionRate.toFixed(1)}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </motion.div>
        )}

        {/* MONTHLY TREND */}
        {activeTab === "trend" && (
          <motion.div key="trend" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-slate-400"><RefreshCw size={24} className="animate-spin mx-auto mb-3" />Loading…</div>
            ) : data ? (
              <>
                <TrendChart data={data.monthlyTrend} />
                <div className="overflow-x-auto rounded-xl border border-slate-700/50">
                  <table className="w-full text-xs text-slate-300">
                    <thead>
                      <tr className="bg-slate-800/80 text-slate-400">
                        <th className="px-3 py-2 text-left">Month</th>
                        <th className="px-3 py-2 text-right">Sessions</th>
                        <th className="px-3 py-2 text-right">Completed</th>
                        <th className="px-3 py-2 text-right">Completion%</th>
                        <th className="px-3 py-2 text-right">Mean θ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.monthlyTrend.map((m) => (
                        <tr key={m.month} className="border-t border-slate-700/30 hover:bg-slate-800/40">
                          <td className="px-3 py-2 font-mono">{m.month}</td>
                          <td className="px-3 py-2 text-right">{m.nSessions}</td>
                          <td className="px-3 py-2 text-right">{m.nCompleted}</td>
                          <td className="px-3 py-2 text-right" style={{ color: m.completionRate >= 80 ? "#10b981" : "#f59e0b" }}>
                            {m.completionRate.toFixed(1)}%
                          </td>
                          <td className="px-3 py-2 text-right font-mono">{m.meanTheta.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </motion.div>
        )}

        {/* SKILLS */}
        {activeTab === "skills" && (
          <motion.div key="skills" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-slate-400"><RefreshCw size={24} className="animate-spin mx-auto mb-3" />Loading…</div>
            ) : data ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.skillBreakdown.map((s) => (
                  <div key={s.skill} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium text-white"
                        style={{ background: SKILL_COLORS[s.skill] ?? "#6366f1" }}
                      >
                        {s.skill}
                      </span>
                      <span className="text-slate-400 text-xs">{s.nSessions} sessions</span>
                      <span className="ml-auto font-medium text-xs" style={{ color: CEFR_COLORS[s.cefrMode] ?? "#94a3b8" }}>
                        Mode: {s.cefrMode}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-slate-500">Mean θ</div>
                        <div className="text-white font-mono">{s.meanTheta.toFixed(3)}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">SD θ</div>
                        <div className="text-white font-mono">{s.sdTheta.toFixed(3)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </motion.div>
        )}

        {/* TOP/BOTTOM ITEMS */}
        {activeTab === "items" && (
          <motion.div key="items" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex gap-2">
              <button
                onClick={() => setShowBottom(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!showBottom ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-300"}`}
              >
                Top 20 (Highest Disc.)
              </button>
              <button
                onClick={() => setShowBottom(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${showBottom ? "bg-red-700 text-white" : "bg-slate-700 text-slate-300"}`}
              >
                Bottom 20 (Lowest Disc.)
              </button>
            </div>
            {loading ? (
              <div className="text-center py-12 text-slate-400"><RefreshCw size={24} className="animate-spin mx-auto mb-3" />Loading…</div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-700/50">
                <table className="w-full text-xs text-slate-300">
                  <thead>
                    <tr className="bg-slate-800/80 text-slate-400">
                      <th className="px-3 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-left">Skill</th>
                      <th className="px-3 py-2 text-left">CEFR</th>
                      <th className="px-3 py-2 text-right">N Resp.</th>
                      <th className="px-3 py-2 text-right">p-correct</th>
                      <th className="px-3 py-2 text-right">Difficulty b</th>
                      <th className="px-3 py-2 text-right">Discrim. a</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayItems.map((it) => (
                      <tr key={it.itemId} className="border-t border-slate-700/30 hover:bg-slate-800/40">
                        <td className="px-3 py-2 font-mono text-white">{it.itemLabel}</td>
                        <td className="px-3 py-2">
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium text-white" style={{ background: SKILL_COLORS[it.skill] ?? "#6366f1" }}>
                            {it.skill.slice(0, 3)}
                          </span>
                        </td>
                        <td className="px-3 py-2" style={{ color: CEFR_COLORS[it.cefrLevel] ?? "#94a3b8" }}>{it.cefrLevel}</td>
                        <td className="px-3 py-2 text-right">{it.nResponses}</td>
                        <td className="px-3 py-2 text-right font-mono">{(it.pCorrect * 100).toFixed(1)}%</td>
                        <td className="px-3 py-2 text-right font-mono">{it.difficulty.toFixed(3)}</td>
                        <td className="px-3 py-2 text-right font-mono" style={{ color: it.discrimination >= 1.0 ? "#10b981" : it.discrimination >= 0.5 ? "#f59e0b" : "#ef4444" }}>
                          {it.discrimination.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
