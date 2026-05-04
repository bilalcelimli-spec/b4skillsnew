/**
 * Rater Reliability Panel
 *
 * Admin view for inter-rater reliability on Writing and Speaking items.
 *
 * Metrics:
 *   - QWK (Quadratic Weighted Kappa) — stored per RatingTask
 *   - Exact agreement % (score == secondRaterScore within 0.05)
 *   - Adjacent agreement % (|score - secondRaterScore| ≤ 0.10)
 *   - Arbitration rate (requiresArbitration = true)
 *   - Per-rater calibration: mean deviation from group mean
 *
 * Three tabs:
 *   1. Overview — aggregate metrics + sparklines
 *   2. Task List — recent double-scored tasks with score comparison
 *   3. Rater Calibration — per-rater bias/leniency table
 *
 * Endpoint: GET /api/psychometrics/rater-reliability
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, AlertTriangle, Users, CheckCircle2 } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface RaterStat {
  raterId: string;
  raterName: string;
  taskCount: number;
  meanScore: number;
  deviation: number;     // mean(rater score) - overall mean
  exactAgreementRate: number;
  qwkMean: number;
}

interface RatingTaskRow {
  id: string;
  skill: string;
  cefrLevel: string;
  score1: number;
  score2: number;
  qwk: number | null;
  requiresArbitration: boolean;
  rater1Name: string;
  rater2Name: string;
}

interface RaterReliabilityData {
  totalDoubleScored: number;
  exactAgreementRate: number;
  adjacentAgreementRate: number;
  arbitrationRate: number;
  meanQwk: number;
  raterStats: RaterStat[];
  recentTasks: RatingTaskRow[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const QWK_COLOR = (q: number) =>
  q >= 0.8 ? "#059669" : q >= 0.6 ? "#0891b2" : q >= 0.4 ? "#d97706" : "#ef4444";

function QwkBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-400 text-xs">—</span>;
  const label = value >= 0.8 ? "Excellent" : value >= 0.6 ? "Good" : value >= 0.4 ? "Fair" : "Poor";
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: `${QWK_COLOR(value)}18`, color: QWK_COLOR(value) }}
    >
      {value.toFixed(3)} ({label})
    </span>
  );
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 bg-white text-center">
      <p className="text-2xl font-bold" style={{ color: color ?? "#4f46e5" }}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function RaterReliabilityPanel() {
  const [data, setData] = useState<RaterReliabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "tasks" | "raters">("overview");

  const load = () => {
    setLoading(true);
    fetch("/api/psychometrics/rater-reliability", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setData(d); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const TABS = [
    { id: "overview" as const, label: "Overview" },
    { id: "tasks"    as const, label: `Recent Tasks (${data?.recentTasks.length ?? "…"})` },
    { id: "raters"   as const, label: `Rater Calibration (${data?.raterStats.length ?? "…"})` },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Rater Reliability</h2>
          <p className="text-sm text-slate-400">
            Inter-rater agreement metrics for Writing &amp; Speaking double-scored tasks
            {data && ` · ${data.totalDoubleScored.toLocaleString()} double-scored tasks`}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
        </div>
      )}

      {!loading && data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-5 gap-3">
            <MetricCard
              label="Mean QWK"
              value={data.meanQwk.toFixed(3)}
              sub="Target ≥ 0.70"
              color={QWK_COLOR(data.meanQwk)}
            />
            <MetricCard
              label="Exact Agreement"
              value={`${(data.exactAgreementRate * 100).toFixed(1)}%`}
              sub="±0.05 tolerance"
              color={data.exactAgreementRate >= 0.7 ? "#059669" : "#d97706"}
            />
            <MetricCard
              label="Adjacent Agreement"
              value={`${(data.adjacentAgreementRate * 100).toFixed(1)}%`}
              sub="±0.10 tolerance"
              color={data.adjacentAgreementRate >= 0.9 ? "#059669" : "#d97706"}
            />
            <MetricCard
              label="Arbitration Rate"
              value={`${(data.arbitrationRate * 100).toFixed(1)}%`}
              sub="Target < 5%"
              color={data.arbitrationRate < 0.05 ? "#059669" : "#ef4444"}
            />
            <MetricCard
              label="Active Raters"
              value={data.raterStats.length.toString()}
              color="#7c3aed"
            />
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

          <AnimatePresence mode="wait">
            {/* ── OVERVIEW ───────────────────────────────────────────── */}
            {tab === "overview" && (
              <motion.div
                key="overview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* QWK benchmark guide */}
                <div className="border border-slate-200 rounded-xl bg-white p-4">
                  <p className="text-sm font-medium text-slate-700 mb-3">QWK Benchmark Guide (Landis &amp; Koch 1977)</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { range: "< 0.40", label: "Poor",      color: "#ef4444" },
                      { range: "0.40–0.60", label: "Moderate", color: "#d97706" },
                      { range: "0.60–0.80", label: "Good",     color: "#0891b2" },
                      { range: "> 0.80",  label: "Excellent", color: "#059669" },
                    ].map((b) => (
                      <div key={b.label} className="rounded-lg p-3 text-center border" style={{ borderColor: `${b.color}40`, backgroundColor: `${b.color}10` }}>
                        <p className="text-sm font-bold" style={{ color: b.color }}>{b.range}</p>
                        <p className="text-xs text-slate-600">{b.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Current platform QWK */}
                <div className="border border-slate-200 rounded-xl bg-white p-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">Platform QWK</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: QWK_COLOR(data.meanQwk) }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, data.meanQwk * 100)}%` }}
                        transition={{ duration: 0.8 }}
                      />
                    </div>
                    <span className="font-mono font-bold text-lg" style={{ color: QWK_COLOR(data.meanQwk) }}>
                      {data.meanQwk.toFixed(3)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Based on {data.totalDoubleScored} double-scored tasks. Target: ≥ 0.70 (Good).
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── TASKS ──────────────────────────────────────────────── */}
            {tab === "tasks" && (
              <motion.div
                key="tasks"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                        <tr>
                          <th className="text-left px-3 py-2.5 font-medium">Skill / CEFR</th>
                          <th className="text-left px-3 py-2.5 font-medium">Rater 1</th>
                          <th className="text-right px-3 py-2.5 font-medium">Score 1</th>
                          <th className="text-left px-3 py-2.5 font-medium">Rater 2</th>
                          <th className="text-right px-3 py-2.5 font-medium">Score 2</th>
                          <th className="text-right px-3 py-2.5 font-medium">Δ</th>
                          <th className="text-center px-3 py-2.5 font-medium">QWK</th>
                          <th className="text-center px-3 py-2.5 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.recentTasks.map((t) => {
                          const delta = Math.abs(t.score1 - t.score2);
                          return (
                            <tr key={t.id} className={`hover:bg-slate-50 ${t.requiresArbitration ? "bg-amber-50" : ""}`}>
                              <td className="px-3 py-2">
                                <span className="font-medium text-slate-700">{t.skill}</span>
                                <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{t.cefrLevel}</span>
                              </td>
                              <td className="px-3 py-2 text-slate-500">{t.rater1Name}</td>
                              <td className="px-3 py-2 text-right font-mono text-slate-700">{(t.score1 * 10).toFixed(1)}</td>
                              <td className="px-3 py-2 text-slate-500">{t.rater2Name}</td>
                              <td className="px-3 py-2 text-right font-mono text-slate-700">{(t.score2 * 10).toFixed(1)}</td>
                              <td className={`px-3 py-2 text-right font-mono ${delta > 0.2 ? "text-red-600 font-semibold" : "text-slate-500"}`}>
                                {(delta * 10).toFixed(1)}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <QwkBadge value={t.qwk} />
                              </td>
                              <td className="px-3 py-2 text-center">
                                {t.requiresArbitration
                                  ? <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto" />
                                  : <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                                }
                              </td>
                            </tr>
                          );
                        })}
                        {data.recentTasks.length === 0 && (
                          <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                              No double-scored tasks yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── RATER CALIBRATION ──────────────────────────────────── */}
            {tab === "raters" && (
              <motion.div
                key="raters"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                      <tr>
                        <th className="text-left px-3 py-2.5 font-medium flex items-center gap-1.5">
                          <Users size={12} /> Rater
                        </th>
                        <th className="text-right px-3 py-2.5 font-medium">Tasks</th>
                        <th className="text-right px-3 py-2.5 font-medium">Mean Score</th>
                        <th className="text-left px-3 py-2.5 font-medium w-40">Bias (vs. group)</th>
                        <th className="text-right px-3 py-2.5 font-medium">Exact Agree.</th>
                        <th className="text-center px-3 py-2.5 font-medium">Mean QWK</th>
                        <th className="text-center px-3 py-2.5 font-medium">Calibration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.raterStats.map((r) => {
                        const biasAbs = Math.abs(r.deviation);
                        const calibOk = biasAbs < 0.05;
                        return (
                          <tr key={r.raterId} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-medium text-slate-700">{r.raterName}</td>
                            <td className="px-3 py-2 text-right text-slate-500">{r.taskCount}</td>
                            <td className="px-3 py-2 text-right font-mono text-slate-700">{(r.meanScore * 10).toFixed(1)}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1.5">
                                {/* Bias bar — centered at 50% */}
                                <div className="flex-1 relative h-2 bg-slate-100 rounded overflow-hidden">
                                  <div
                                    className="absolute top-0 h-full rounded"
                                    style={{
                                      backgroundColor: biasAbs > 0.1 ? "#ef4444" : biasAbs > 0.05 ? "#d97706" : "#059669",
                                      left: r.deviation < 0 ? `${Math.max(0, 50 - biasAbs * 200)}%` : "50%",
                                      width: `${Math.min(50, biasAbs * 200)}%`,
                                    }}
                                  />
                                  {/* Center line */}
                                  <div className="absolute top-0 bottom-0 w-px bg-slate-300" style={{ left: "50%" }} />
                                </div>
                                <span className={`text-xs font-mono w-14 flex-shrink-0 ${biasAbs > 0.05 ? "text-red-600" : "text-slate-500"}`}>
                                  {r.deviation >= 0 ? "+" : ""}{(r.deviation * 10).toFixed(2)}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-slate-700">
                              {(r.exactAgreementRate * 100).toFixed(1)}%
                            </td>
                            <td className="px-3 py-2 text-center">
                              <QwkBadge value={r.qwkMean} />
                            </td>
                            <td className="px-3 py-2 text-center">
                              {calibOk
                                ? <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">OK</span>
                                : <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Review</span>
                              }
                            </td>
                          </tr>
                        );
                      })}
                      {data.raterStats.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-slate-400">No rater data available.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Bias = rater mean – overall mean (0–10 scale). Values &gt;±0.5 suggest lenient/severe rating patterns requiring calibration.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
