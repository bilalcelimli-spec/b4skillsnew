/**
 * Classification Accuracy Panel
 *
 * IRT-based decision accuracy at each CEFR cut score.
 *
 * Metrics (Livingston-Lewis 1995):
 *   - Classification accuracy: P(observed CEFR = true CEFR) across all candidates
 *   - Classification consistency: P(same CEFR on two independent tests)
 *   - Marginal reliability (ρ = 1 - meanSE² / varθ)
 *   - Conditional SEM at each CEFR cut
 *
 * Three views:
 *   1. Overview — global metrics + reliability gauge
 *   2. CEFR Cuts — per cut-score accuracy, SEM, misclassification rate
 *   3. Theta Distribution — histogram of candidate thetas with CEFR bands
 *
 * Endpoint: GET /api/psychometrics/classification-accuracy
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, TrendingUp } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CutScoreRow {
  level: string;
  cutTheta: number;
  conditionalSem: number;
  candidatesNearCut: number;
  misclassificationRate: number;
}

interface ClassificationData {
  sampleSize: number;
  marginalReliability: number;
  classificationConsistency: number;
  cronbachAlpha: number;
  meanSem: number;
  cutScores: CutScoreRow[];
  thetaHistogram: { bin: number; count: number; cefrLevel: string }[];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const CEFR_COLORS: Record<string, string> = {
  PRE_A1: "#94a3b8", A1: "#64748b", A2: "#0284c7",
  B1: "#0891b2", B2: "#059669", C1: "#7c3aed", C2: "#db2777",
};

const CEFR_ORDER = ["PRE_A1","A1","A2","B1","B2","C1","C2"];

function GaugeBar({ value, label, low, high }: { value: number; label: string; low: number; high: number }) {
  const color = value >= high ? "#059669" : value >= low ? "#0891b2" : "#d97706";
  return (
    <div>
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{label}</span>
        <span className="font-mono font-semibold" style={{ color }}>{value.toFixed(3)}</span>
      </div>
      <div className="bg-slate-100 rounded-full h-3 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, value * 100)}%` }}
          transition={{ duration: 0.7 }}
        />
      </div>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ClassificationAccuracyPanel() {
  const [data, setData] = useState<ClassificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "cuts" | "distribution">("overview");

  const load = () => {
    setLoading(true);
    fetch("/api/psychometrics/classification-accuracy", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setData(d); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const TABS = [
    { id: "overview"     as const, label: "Overview" },
    { id: "cuts"         as const, label: "CEFR Cut Scores" },
    { id: "distribution" as const, label: "θ Distribution" },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Classification Accuracy</h2>
          <p className="text-sm text-slate-400">
            IRT-based decision accuracy at CEFR cut scores (Livingston–Lewis 1995)
            {data && ` · n = ${data.sampleSize.toLocaleString()} completed sessions`}
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
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Marginal Reliability", value: data.marginalReliability.toFixed(3), color: data.marginalReliability >= 0.9 ? "#059669" : data.marginalReliability >= 0.8 ? "#0891b2" : "#d97706", sub: "Target ≥ 0.90" },
              { label: "Classification Consistency", value: data.classificationConsistency.toFixed(3), color: data.classificationConsistency >= 0.85 ? "#059669" : "#d97706", sub: "Livingston-Lewis" },
              { label: "Cronbach α", value: data.cronbachAlpha.toFixed(3), color: data.cronbachAlpha >= 0.9 ? "#059669" : "#d97706", sub: "Internal consistency" },
              { label: "Mean SEM", value: `±${data.meanSem.toFixed(3)}`, color: data.meanSem < 0.35 ? "#059669" : "#d97706", sub: "Avg standard error" },
            ].map((c) => (
              <div key={c.label} className="rounded-xl border border-slate-200 p-4 bg-white text-center">
                <p className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{c.label}</p>
                <p className="text-xs text-slate-400">{c.sub}</p>
              </div>
            ))}
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
                <div className="border border-slate-200 rounded-xl bg-white p-5 space-y-4">
                  <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                    Psychometric Quality Indices
                  </p>
                  <GaugeBar value={data.marginalReliability} label="Marginal Reliability (ρ)" low={0.8} high={0.9} />
                  <GaugeBar value={data.classificationConsistency} label="Classification Consistency" low={0.8} high={0.85} />
                  <GaugeBar value={data.cronbachAlpha} label="Cronbach α" low={0.8} high={0.9} />
                  <GaugeBar value={Math.max(0, 1 - data.meanSem * 2)} label="Precision (1 − 2×SEM)" low={0.2} high={0.4} />
                </div>
                {/* Interpretation guide */}
                <div className="border border-slate-100 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-600 mb-2">Standards Reference</p>
                  <div className="grid grid-cols-3 gap-3 text-xs text-slate-500">
                    <div><span className="font-semibold text-slate-700">Reliability ≥ 0.90</span> — High-stakes certification standard (ALTE)</div>
                    <div><span className="font-semibold text-slate-700">Consistency ≥ 0.85</span> — Acceptable decision consistency</div>
                    <div><span className="font-semibold text-slate-700">SEM ≤ 0.35 logit</span> — Precise enough for CEFR classification</div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── CUT SCORES ─────────────────────────────────────────── */}
            {tab === "cuts" && (
              <motion.div
                key="cuts"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                      <tr>
                        <th className="text-left px-3 py-2.5 font-medium">CEFR Level</th>
                        <th className="text-right px-3 py-2.5 font-medium">Cut θ</th>
                        <th className="text-right px-3 py-2.5 font-medium">SEM at cut</th>
                        <th className="text-right px-3 py-2.5 font-medium">n near cut (±0.5)</th>
                        <th className="text-left px-3 py-2.5 font-medium w-40">Misclass. Risk</th>
                        <th className="text-center px-3 py-2.5 font-medium">Decision Quality</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.cutScores.map((cut) => {
                        const risk = cut.misclassificationRate;
                        const quality = risk < 0.05 ? "Excellent" : risk < 0.10 ? "Good" : risk < 0.20 ? "Fair" : "Poor";
                        const qualityColor = risk < 0.05 ? "#059669" : risk < 0.10 ? "#0891b2" : risk < 0.20 ? "#d97706" : "#ef4444";
                        return (
                          <tr key={cut.level} className="hover:bg-slate-50">
                            <td className="px-3 py-2.5">
                              <span className="px-2 py-1 rounded font-semibold text-white text-xs"
                                style={{ backgroundColor: CEFR_COLORS[cut.level] ?? "#64748b" }}>
                                {cut.level.replace("_", " ")}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-slate-700">
                              {cut.cutTheta >= 0 ? "+" : ""}{cut.cutTheta.toFixed(2)}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-slate-600">
                              ±{cut.conditionalSem.toFixed(3)}
                            </td>
                            <td className="px-3 py-2.5 text-right text-slate-500">{cut.candidatesNearCut}</td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 bg-slate-100 rounded h-2 overflow-hidden">
                                  <div
                                    className="h-full rounded"
                                    style={{ width: `${Math.min(100, risk * 500)}%`, backgroundColor: qualityColor }}
                                  />
                                </div>
                                <span className="text-xs font-mono w-10 flex-shrink-0" style={{ color: qualityColor }}>
                                  {(risk * 100).toFixed(1)}%
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{ backgroundColor: `${qualityColor}18`, color: qualityColor }}>
                                {quality}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {data.cutScores.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-400">No cut score data available.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Misclassification risk = P(error | near cut) = Φ(cut ± SEM). Candidates within ±0.5 logits of a cut score are most at risk.
                </p>
              </motion.div>
            )}

            {/* ── THETA DISTRIBUTION ─────────────────────────────────── */}
            {tab === "distribution" && (
              <motion.div
                key="distribution"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="border border-slate-200 rounded-xl bg-white p-4">
                  <p className="text-sm font-medium text-slate-700 mb-4">
                    θ Distribution with CEFR Bands (n = {data.sampleSize})
                  </p>
                  {data.thetaHistogram.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-8">No theta data yet — run completed assessments first.</p>
                  ) : (
                    <>
                      {/* Histogram */}
                      <div className="relative">
                        <div className="flex items-end gap-0.5 h-32">
                          {data.thetaHistogram.map((bin, i) => {
                            const maxCount = Math.max(...data.thetaHistogram.map((b) => b.count), 1);
                            const height = (bin.count / maxCount) * 100;
                            const color = CEFR_COLORS[bin.cefrLevel] ?? "#94a3b8";
                            return (
                              <motion.div
                                key={i}
                                className="flex-1 rounded-t"
                                style={{ backgroundColor: color, opacity: 0.75 }}
                                initial={{ height: 0 }}
                                animate={{ height: `${height}%` }}
                                transition={{ duration: 0.4, delay: i * 0.015 }}
                                title={`θ=${bin.bin.toFixed(1)}: n=${bin.count} (${bin.cefrLevel})`}
                              />
                            );
                          })}
                        </div>
                        {/* X-axis */}
                        <div className="flex justify-between text-xs text-slate-400 mt-1 font-mono">
                          <span>−3</span><span>−2</span><span>−1</span><span>0</span><span>+1</span><span>+2</span><span>+3</span>
                        </div>
                        <p className="text-center text-xs text-slate-400 mt-0.5">θ (logits)</p>
                      </div>
                      {/* Legend */}
                      <div className="flex flex-wrap gap-3 mt-3 justify-center">
                        {CEFR_ORDER.filter((l) => CEFR_COLORS[l]).map((lvl) => (
                          <div key={lvl} className="flex items-center gap-1.5 text-xs text-slate-600">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: CEFR_COLORS[lvl] }} />
                            {lvl.replace("_", " ")}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
