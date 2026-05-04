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
import { RefreshCw, CheckCircle2, XCircle, ChevronRight, TrendingUp } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SkillScore {
  skill: string;
  theta: number;
  cefrLevel: string;
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

  // Build theta trajectory from responses
  const trajectory = report.responses.map((r, i) => ({ i: i + 1, theta: r.thetaAfter, sem: r.semAfter }));

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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.responses.map((r, i) => (
                    <tr key={r.itemId + i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-center text-slate-400">{i + 1}</td>
                      <td className="px-3 py-2 text-slate-600">{r.skill}</td>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── TRAJECTORY ───────────────────────────────────────────────────── */}
      {tab === "trajectory" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="border border-slate-200 rounded-xl p-4 bg-white">
            <p className="text-sm font-medium text-slate-700 mb-4">θ Convergence Trajectory</p>
            {trajectory.length < 2 ? (
              <p className="text-xs text-slate-400 text-center py-6">Need at least 2 items for trajectory.</p>
            ) : (
              <div className="relative h-40 bg-slate-50 rounded-lg overflow-hidden px-4 py-2">
                <svg viewBox={`0 0 ${trajectory.length * 20} 100`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
                  {/* SEM band */}
                  <path
                    d={[
                      ...trajectory.map((p, i) => `${i === 0 ? "M" : "L"} ${i * 20 + 10} ${50 - ((p.theta + p.sem + 3) / 6) * 80}`),
                      ...trajectory.map((p, i) => `${i === 0 ? "L" : "L"} ${(trajectory.length - 1 - i) * 20 + 10} ${50 - ((trajectory[trajectory.length - 1 - i].theta - trajectory[trajectory.length - 1 - i].sem + 3) / 6) * 80}`),
                      "Z"
                    ].join(" ")}
                    fill={cefrColor}
                    fillOpacity="0.1"
                  />
                  {/* Theta line */}
                  <polyline
                    points={trajectory.map((p, i) => `${i * 20 + 10},${50 - ((p.theta + 3) / 6) * 80}`).join(" ")}
                    fill="none"
                    stroke={cefrColor}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Final point */}
                  <circle
                    cx={(trajectory.length - 1) * 20 + 10}
                    cy={50 - ((trajectory[trajectory.length - 1].theta + 3) / 6) * 80}
                    r="3"
                    fill={cefrColor}
                  />
                </svg>
                {/* Y axis labels */}
                <div className="absolute inset-y-2 left-0 flex flex-col justify-between text-xs text-slate-400 font-mono">
                  <span>+3</span>
                  <span>0</span>
                  <span>−3</span>
                </div>
              </div>
            )}
            <p className="text-xs text-slate-400 mt-2">
              Band = ±1 SEM. Line converges as more items are administered — narrower band indicates higher measurement precision.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
