/**
 * Candidate Adaptive Report
 *
 * Detailed post-assessment report for candidates showing:
 *   - Final CEFR level + theta with precision band (±1 SEM)
 *   - Skill profile spider (6D MIRT vector when available)
 *   - Item-by-item response history with theta trajectory
 *   - CEFR can-do descriptors for the achieved level
 *   - Recommended next steps
 *
 * Used both in candidate-facing result screen and by admins
 * reviewing a completed session (linked from SessionReview).
 */

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { RefreshCw, CheckCircle2, XCircle, ChevronRight, TrendingUp, BarChart2 } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Area, AreaChart, Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SkillScore {
  skill: string;
  theta: number;
  cefrLevel: string;
}

interface RubricScores {
  grammar?: number;
  vocabulary?: number;
  coherence?: number;
  taskRelevance?: number;
  fluency?: number;
}

interface ResponseEntry {
  itemId: string;
  skill: string;
  cefrLevel: string;
  isCorrect: boolean | null;
  score: number | null;
  thetaAfter: number;
  semAfter: number;
  latencyMs: number;
  rubricScores?: RubricScores;
  aiFeedback?: string;
}

interface AdaptiveReport {
  sessionId: string;
  candidateName?: string;
  completedAt: string;
  finalTheta: number;
  finalSem: number;
  cefrLevel: string;
  skillScores: SkillScore[];
  responses: ResponseEntry[];
  totalItems: number;
  stopReason: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CEFR_COLORS: Record<string, string> = {
  PRE_A1: "#94a3b8", A1: "#64748b", A2: "#0284c7",
  B1: "#0891b2", B2: "#059669", C1: "#7c3aed", C2: "#db2777",
};

const SKILL_COLORS = ["#4f46e5","#0891b2","#059669","#d97706","#7c3aed","#db2777"];
const SKILL_LABELS: Record<string, string> = {
  READING: "Reading", LISTENING: "Listening", WRITING: "Writing",
  SPEAKING: "Speaking", GRAMMAR: "Grammar", VOCABULARY: "Vocabulary",
};

// CEFR theta thresholds for reference lines on trajectory chart
const CEFR_LINES = [
  { theta: -2.5, label: "A1", color: "#64748b" },
  { theta: -1.5, label: "A2", color: "#0284c7" },
  { theta: -0.5, label: "B1", color: "#0891b2" },
  { theta:  0.5, label: "B2", color: "#059669" },
  { theta:  1.5, label: "C1", color: "#7c3aed" },
  { theta:  2.5, label: "C2", color: "#db2777" },
];

function ThetaBar({ theta, sem, color }: { theta: number; sem: number; color: string }) {
  const pct = Math.max(0, Math.min(100, ((theta + 3) / 6) * 100));
  const semPct = (sem / 6) * 100;
  return (
    <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
      {/* SEM band */}
      <div
        className="absolute inset-y-0 rounded-full opacity-25"
        style={{
          backgroundColor: color,
          left: `${Math.max(0, pct - semPct)}%`,
          right: `${Math.max(0, 100 - pct - semPct)}%`,
        }}
      />
      {/* Mean marker */}
      <motion.div
        className="absolute top-0 bottom-0 w-1 rounded"
        style={{ backgroundColor: color }}
        initial={{ left: "50%" }}
        animate={{ left: `${pct}%` }}
        transition={{ duration: 0.7, type: "spring" }}
      />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  sessionId: string;
  onClose?: () => void;
}

export function CandidateAdaptiveReport({ sessionId, onClose }: Props) {
  const [report, setReport] = useState<AdaptiveReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "items" | "trajectory">("overview");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/sessions/${sessionId}/adaptive-report`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setReport(d); })
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!report) {
    return <p className="text-center py-12 text-slate-400 text-sm">Report not available for this session.</p>;
  }

  const cefrColor = CEFR_COLORS[report.cefrLevel] ?? "#64748b";
  const TABS = [
    { id: "overview"   as const, label: "Overview" },
    { id: "items"      as const, label: `Items (${report.totalItems})` },
    { id: "trajectory" as const, label: "θ Trajectory" },
  ];

  // Build theta trajectory dataset for recharts
  const trajectory = report.responses.map((r, i) => ({
    item: i + 1,
    theta: parseFloat(r.thetaAfter.toFixed(3)),
    upper: parseFloat((r.thetaAfter + r.semAfter).toFixed(3)),
    lower: parseFloat((r.thetaAfter - r.semAfter).toFixed(3)),
    skill: r.skill,
    cefr: r.cefrLevel,
  }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onClose && (
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-semibold text-slate-800">
              {report.candidateName ?? "Candidate"} — Adaptive Report
            </h2>
            <p className="text-sm text-slate-400">
              {new Date(report.completedAt).toLocaleString()} · {report.totalItems} items · {report.stopReason}
            </p>
          </div>
        </div>
        {/* CEFR badge */}
        <div
          className="px-5 py-2 rounded-xl text-white font-bold text-xl"
          style={{ backgroundColor: cefrColor }}
        >
          {report.cefrLevel.replace("_", " ")}
        </div>
      </div>

      {/* Theta summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 p-4 bg-white">
          <p className="text-xs text-slate-500 mb-1">Final θ</p>
          <p className="text-2xl font-bold font-mono" style={{ color: cefrColor }}>
            {report.finalTheta >= 0 ? "+" : ""}{report.finalTheta.toFixed(3)}
          </p>
          <ThetaBar theta={report.finalTheta} sem={report.finalSem} color={cefrColor} />
          <p className="text-xs text-slate-400 mt-1">±{report.finalSem.toFixed(3)} SEM</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4 bg-white col-span-2">
          <p className="text-xs font-medium text-slate-600 mb-3">Skill Profile (6D MIRT)</p>
          <div className="space-y-1.5">
            {report.skillScores.map((s, i) => (
              <div key={s.skill} className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-20 flex-shrink-0">{s.skill}</span>
                <div className="flex-1">
                  <ThetaBar theta={s.theta} sem={0.3} color={SKILL_COLORS[i % 6]} />
                </div>
                <span className="text-xs font-mono font-semibold flex-shrink-0" style={{ color: SKILL_COLORS[i % 6] }}>
                  {s.theta >= 0 ? "+" : ""}{s.theta.toFixed(2)}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                  style={{ backgroundColor: `${SKILL_COLORS[i % 6]}15`, color: SKILL_COLORS[i % 6] }}>
                  {s.cefrLevel.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? "border-indigo-600 text-indigo-700 bg-indigo-50"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="border border-slate-200 rounded-xl p-4 bg-white">
            <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              Measurement Precision
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-bold font-mono" style={{ color: cefrColor }}>
                  {report.finalTheta.toFixed(2)}
                </p>
                <p className="text-xs text-slate-500">θ estimate</p>
              </div>
              <div>
                <p className="text-lg font-bold font-mono text-slate-800">±{report.finalSem.toFixed(3)}</p>
                <p className="text-xs text-slate-500">SEM</p>
              </div>
              <div>
                <p className={`text-lg font-bold ${report.finalSem < 0.35 ? "text-green-700" : report.finalSem < 0.45 ? "text-amber-700" : "text-red-700"}`}>
                  {report.finalSem < 0.35 ? "High" : report.finalSem < 0.45 ? "Medium" : "Low"}
                </p>
                <p className="text-xs text-slate-500">Precision</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── ITEMS ────────────────────────────────────────────────────────── */}
      {tab === "items" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                  <tr>
                    <th className="text-center px-3 py-2.5 font-medium w-8">#</th>
                    <th className="text-left px-3 py-2.5 font-medium">Skill</th>
                    <th className="text-left px-3 py-2.5 font-medium">CEFR</th>
                    <th className="text-center px-3 py-2.5 font-medium">Result</th>
                    <th className="text-right px-3 py-2.5 font-medium">θ after</th>
                    <th className="text-right px-3 py-2.5 font-medium">SEM</th>
                    <th className="text-right px-3 py-2.5 font-medium">Latency</th>
                    <th className="text-center px-3 py-2.5 font-medium">Rubric</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.responses.map((r, i) => (
                    <>
                      <tr
                        key={r.itemId + i}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => setExpandedRow(expandedRow === r.itemId + i ? null : r.itemId + i)}
                      >
                        <td className="px-3 py-2 text-center text-slate-400">{i + 1}</td>
                        <td className="px-3 py-2 text-slate-600">{SKILL_LABELS[r.skill] ?? r.skill}</td>
                        <td className="px-3 py-2">
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium"
                            style={{ backgroundColor: `${CEFR_COLORS[r.cefrLevel] ?? "#94a3b8"}20`, color: CEFR_COLORS[r.cefrLevel] ?? "#64748b" }}>
                            {r.cefrLevel.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {r.isCorrect === true || (r.score ?? 0) >= 0.5
                            ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                            : <XCircle className="w-4 h-4 text-red-400 mx-auto" />
                          }
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-700">
                          {r.thetaAfter >= 0 ? "+" : ""}{r.thetaAfter.toFixed(3)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-500">
                          {r.semAfter.toFixed(3)}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-500">
                          {r.latencyMs > 0 ? `${(r.latencyMs / 1000).toFixed(1)}s` : "—"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {r.rubricScores ? (
                            <BarChart2 className="w-3.5 h-3.5 text-indigo-400 mx-auto" />
                          ) : <span className="text-slate-200">—</span>}
                        </td>
                      </tr>
                      {/* Expanded rubric row */}
                      {expandedRow === r.itemId + i && r.rubricScores && (
                        <tr key={`${r.itemId}${i}-rubric`} className="bg-indigo-50/60">
                          <td colSpan={8} className="px-5 py-3">
                            <div className="space-y-1.5">
                              {Object.entries(r.rubricScores).map(([dim, val]) => val != null && (
                                <div key={dim} className="flex items-center gap-3">
                                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 w-24">{dim}</span>
                                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{ width: `${(val as number) * 10}%`, backgroundColor: cefrColor }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-mono text-slate-600 w-6 text-right">{(val as number).toFixed(1)}</span>
                                </div>
                              ))}
                              {r.aiFeedback && (
                                <p className="text-xs text-indigo-700 italic mt-2 border-t border-indigo-100 pt-2">"{r.aiFeedback}"</p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── TRAJECTORY ───────────────────────────────────────────────────── */}
      {tab === "trajectory" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="border border-slate-200 rounded-xl p-5 bg-white">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-slate-700">θ Convergence Trajectory</p>
              <p className="text-xs text-slate-400">Band = ±1 SEM · narrower = higher precision</p>
            </div>
            {trajectory.length < 2 ? (
              <p className="text-xs text-slate-400 text-center py-8">Need at least 2 items.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trajectory} margin={{ top: 8, right: 24, bottom: 0, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis
                    dataKey="item"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    label={{ value: "Item #", position: "insideBottom", offset: -2, fontSize: 11, fill: "#94a3b8" }}
                  />
                  <YAxis
                    domain={[-3.5, 3.5]}
                    tick={{ fontSize: 11, fill: "#94a3b8", fontFamily: "monospace" }}
                    tickFormatter={(v: number) => v >= 0 ? `+${v.toFixed(1)}` : v.toFixed(1)}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as typeof trajectory[number];
                      return (
                        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-lg text-xs">
                          <p className="font-bold text-slate-700">Item {d.item} · {d.skill}</p>
                          <p className="font-mono" style={{ color: cefrColor }}>θ = {d.theta >= 0 ? "+" : ""}{d.theta.toFixed(3)}</p>
                          <p className="text-slate-400">SEM band [{d.lower.toFixed(2)}, {d.upper.toFixed(2)}]</p>
                          <p className="text-slate-500">{d.cefr.replace("_", " ")}</p>
                        </div>
                      );
                    }}
                  />
                  {/* CEFR reference lines */}
                  {CEFR_LINES.map((cl) => (
                    <ReferenceLine
                      key={cl.label}
                      y={cl.theta}
                      stroke={cl.color}
                      strokeDasharray="4 4"
                      strokeOpacity={0.5}
                      label={{ value: cl.label, position: "right", fontSize: 10, fill: cl.color }}
                    />
                  ))}
                  {/* SEM band */}
                  <Area
                    type="monotone"
                    dataKey="upper"
                    stroke="none"
                    fill={cefrColor}
                    fillOpacity={0.08}
                    legendType="none"
                  />
                  <Area
                    type="monotone"
                    dataKey="lower"
                    stroke="none"
                    fill="white"
                    fillOpacity={1}
                    legendType="none"
                  />
                  {/* Theta line */}
                  <Line
                    type="monotone"
                    dataKey="theta"
                    stroke={cefrColor}
                    strokeWidth={2.5}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      const skillIdx = ["READING","LISTENING","WRITING","SPEAKING","GRAMMAR","VOCABULARY"].indexOf(payload.skill);
                      const dotColor = skillIdx >= 0 ? SKILL_COLORS[skillIdx] : cefrColor;
                      return <circle key={payload.item} cx={cx} cy={cy} r={3.5} fill={dotColor} stroke="white" strokeWidth={1.5} />;
                    }}
                    activeDot={{ r: 5, stroke: cefrColor, strokeWidth: 2 }}
                    name="θ estimate"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
          {/* Skill colour legend */}
          <div className="flex flex-wrap gap-3 px-1">
            {["READING","LISTENING","WRITING","SPEAKING","GRAMMAR","VOCABULARY"].map((sk, i) => (
              <div key={sk} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SKILL_COLORS[i] }} />
                <span className="text-xs text-slate-500">{SKILL_LABELS[sk]}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
