/**
 * Psychometric Quality Dashboard
 *
 * Unified admin panel covering three quality dimensions:
 *
 *  1. Reliability — marginal reliability ρ, classification accuracy/consistency,
 *     Cronbach α, conditional SEM (via /api/psychometrics/subscore-reliability)
 *
 *  2. Construct Validity — Pearson inter-trait correlation matrix, Cronbach α
 *     of rubric scales, MTMM convergent/discriminant validity
 *     (via /api/psychometrics/construct-validity)
 *
 *  3. Cultural Fairness — summary of automated fairness checks across active
 *     item pool (via /api/items/cultural-fairness-summary)
 */

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { RefreshCw, Shield, CheckCircle2, AlertTriangle, BarChart3, Layers } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReliabilityReport {
  marginalReliability: number;
  classificationAccuracy: number;
  classificationConsistency: number;
  cronbachAlpha: number;
  testLength: number;
  sampleSize: number;
  conditionalSem: { cefrLevel: string; theta: number; sem: number }[];
}

interface ConstructValidityReport {
  correlationMatrix: { traits: string[]; matrix: number[][] };
  reliability: { alpha: number; k: number; n: number; interpretation: string };
  mtmm: {
    convergentMean: number;
    discriminantMean: number;
    separation: number;
    perGroup: { group: string; convergent: number }[];
  };
}

interface FairnessSummary {
  totalChecked: number;
  pass: number;
  flag: number;
  reject: number;
  byCategory: Record<string, { pass: number; flag: number; reject: number }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function reliabilityColor(r: number) {
  if (r >= 0.9) return "text-green-700 bg-green-50";
  if (r >= 0.8) return "text-indigo-700 bg-indigo-50";
  if (r >= 0.7) return "text-amber-700 bg-amber-50";
  return "text-red-700 bg-red-50";
}

function alphaLabel(a: number) {
  if (a >= 0.9) return "Excellent";
  if (a >= 0.8) return "Good";
  if (a >= 0.7) return "Acceptable";
  if (a >= 0.6) return "Questionable";
  return "Poor";
}

function correlationColor(r: number): string {
  const abs = Math.abs(r);
  if (abs >= 0.7) return "#4f46e5";   // strong — indigo
  if (abs >= 0.5) return "#7c3aed";   // moderate — violet
  if (abs >= 0.3) return "#a78bfa";   // weak
  return "#e2e8f0";                   // negligible
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PsychometricQualityPanel() {
  const [tab, setTab]     = useState<"reliability" | "validity" | "fairness">("reliability");
  const [rel, setRel]     = useState<ReliabilityReport | null>(null);
  const [cv, setCv]       = useState<ConstructValidityReport | null>(null);
  const [fair, setFair]   = useState<FairnessSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2, r3] = await Promise.all([
        fetch("/api/psychometrics/subscore-reliability", { credentials: "include" }),
        fetch("/api/psychometrics/construct-validity", { credentials: "include" }),
        fetch("/api/items/cultural-fairness-summary", { credentials: "include" }),
      ]);
      if (r1.ok) setRel(await r1.json());
      if (r2.ok) setCv(await r2.json());
      if (r3.ok) setFair(await r3.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const TABS = [
    { id: "reliability" as const, label: "Reliability",  icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: "validity"    as const, label: "Construct Validity", icon: <Layers className="w-3.5 h-3.5" /> },
    { id: "fairness"    as const, label: "Cultural Fairness",  icon: <Shield className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Psychometric Quality</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Reliability · Construct validity · Cultural fairness — ETS/ITC standards
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-slate-400 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-slate-200 pb-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? "border-indigo-600 text-indigo-700 bg-indigo-50"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {loading && !rel && !cv && !fair ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
        </div>
      ) : (
        <>
          {/* ── RELIABILITY ──────────────────────────────────────────────── */}
          {tab === "reliability" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {!rel ? (
                <p className="text-sm text-slate-400 text-center py-8">No reliability data available yet.</p>
              ) : (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Marginal Reliability ρ", value: rel.marginalReliability.toFixed(3),   badge: reliabilityColor(rel.marginalReliability) },
                      { label: "Classification Accuracy",value: (rel.classificationAccuracy * 100).toFixed(1) + "%", badge: reliabilityColor(rel.classificationAccuracy) },
                      { label: "Cronbach α",             value: rel.cronbachAlpha.toFixed(3),          badge: reliabilityColor(rel.cronbachAlpha) },
                      { label: "Sample Size",             value: rel.sampleSize.toLocaleString(),       badge: "text-slate-700 bg-slate-50" },
                    ].map((c) => (
                      <div key={c.label} className={`rounded-xl p-4 ${c.badge}`}>
                        <div className="text-2xl font-bold">{c.value}</div>
                        <div className="text-xs font-medium mt-0.5 opacity-80 leading-tight">{c.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Conditional SEM table */}
                  {rel.conditionalSem?.length > 0 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-medium text-slate-700">Conditional SEM by CEFR Level</p>
                      </div>
                      <table className="w-full text-xs">
                        <thead className="text-slate-500 bg-slate-50">
                          <tr>
                            <th className="text-left px-4 py-2 font-medium">CEFR</th>
                            <th className="text-right px-4 py-2 font-medium">θ</th>
                            <th className="text-right px-4 py-2 font-medium">SEM</th>
                            <th className="px-4 py-2 font-medium">SEM Bar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {rel.conditionalSem.map((row) => (
                            <tr key={row.cefrLevel} className="hover:bg-slate-50">
                              <td className="px-4 py-2 font-medium text-slate-700">{row.cefrLevel}</td>
                              <td className="px-4 py-2 text-right font-mono text-slate-600">{row.theta.toFixed(2)}</td>
                              <td className="px-4 py-2 text-right font-mono text-slate-600">{row.sem.toFixed(3)}</td>
                              <td className="px-4 py-2 w-32">
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <motion.div
                                    className={`h-full rounded-full ${row.sem < 0.3 ? "bg-green-500" : row.sem < 0.4 ? "bg-amber-400" : "bg-red-500"}`}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, row.sem * 200)}%` }}
                                    transition={{ duration: 0.5 }}
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="text-xs text-slate-400 bg-slate-50 rounded-lg p-3">
                    Target benchmarks: ρ ≥ 0.90 · Classification accuracy ≥ 0.85 · Cronbach α ≥ 0.80
                    · Test length {rel.testLength} items
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ── CONSTRUCT VALIDITY ───────────────────────────────────────── */}
          {tab === "validity" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {!cv ? (
                <p className="text-sm text-slate-400 text-center py-8">No construct validity data available yet.</p>
              ) : (
                <>
                  {/* MTMM summary */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl p-4 bg-indigo-50 text-indigo-700">
                      <div className="text-2xl font-bold">{cv.mtmm.convergentMean.toFixed(2)}</div>
                      <div className="text-xs font-medium mt-0.5 opacity-80">Convergent r̄</div>
                    </div>
                    <div className="rounded-xl p-4 bg-slate-50 text-slate-700">
                      <div className="text-2xl font-bold">{cv.mtmm.discriminantMean.toFixed(2)}</div>
                      <div className="text-xs font-medium mt-0.5 opacity-80">Discriminant r̄</div>
                    </div>
                    <div className={`rounded-xl p-4 ${cv.mtmm.separation >= 0.1 ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                      <div className="text-2xl font-bold">{cv.mtmm.separation.toFixed(2)}</div>
                      <div className="text-xs font-medium mt-0.5 opacity-80">
                        Separation {cv.mtmm.separation >= 0.1 ? "✓" : "△"}
                      </div>
                    </div>
                  </div>

                  {/* Cronbach α */}
                  <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-4">
                    <div className={`px-3 py-2 rounded-lg text-sm font-bold ${reliabilityColor(cv.reliability.alpha)}`}>
                      α = {cv.reliability.alpha.toFixed(3)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{alphaLabel(cv.reliability.alpha)}</p>
                      <p className="text-xs text-slate-500">{cv.reliability.k} traits · n = {cv.reliability.n}</p>
                    </div>
                  </div>

                  {/* Correlation matrix */}
                  {cv.correlationMatrix?.traits?.length > 0 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-medium text-slate-700">Inter-trait Correlation Matrix (Pearson r)</p>
                      </div>
                      <div className="overflow-x-auto p-4">
                        <table className="text-xs border-collapse">
                          <thead>
                            <tr>
                              <th className="p-1" />
                              {cv.correlationMatrix.traits.map((t) => (
                                <th key={t} className="p-1 text-center text-slate-500 font-medium w-16">{t}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {cv.correlationMatrix.traits.map((rowTrait, i) => (
                              <tr key={rowTrait}>
                                <td className="p-1 text-right text-slate-500 font-medium pr-2">{rowTrait}</td>
                                {cv.correlationMatrix.matrix[i].map((r, j) => (
                                  <td key={j} className="p-0.5">
                                    <div
                                      className="w-14 h-7 rounded flex items-center justify-center text-xs font-mono font-medium text-white"
                                      style={{
                                        backgroundColor: i === j ? "#1e1b4b" : correlationColor(r),
                                        opacity: i === j ? 1 : 0.7 + Math.abs(r) * 0.3,
                                      }}
                                    >
                                      {r.toFixed(2)}
                                    </div>
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="px-4 pb-3 text-xs text-slate-400">
                        Target: convergent r ≥ 0.50 within construct groups · discriminant r &lt; convergent r (Campbell &amp; Fiske 1959)
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ── CULTURAL FAIRNESS ────────────────────────────────────────── */}
          {tab === "fairness" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {!fair ? (
                <p className="text-sm text-slate-400 text-center py-8">No fairness data available yet.</p>
              ) : (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl p-4 bg-green-50 text-green-700">
                      <div className="text-2xl font-bold">{fair.pass}</div>
                      <div className="text-xs font-medium mt-0.5 opacity-80">Pass</div>
                    </div>
                    <div className="rounded-xl p-4 bg-amber-50 text-amber-700">
                      <div className="text-2xl font-bold">{fair.flag}</div>
                      <div className="text-xs font-medium mt-0.5 opacity-80">Flagged</div>
                    </div>
                    <div className="rounded-xl p-4 bg-red-50 text-red-700">
                      <div className="text-2xl font-bold">{fair.reject}</div>
                      <div className="text-xs font-medium mt-0.5 opacity-80">Reject</div>
                    </div>
                  </div>

                  {/* Pass rate bar */}
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex justify-between text-xs text-slate-600 mb-2">
                      <span>Overall Pass Rate</span>
                      <span className="font-semibold">
                        {fair.totalChecked > 0
                          ? ((fair.pass / fair.totalChecked) * 100).toFixed(1)
                          : "0"}%
                      </span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
                      {fair.totalChecked > 0 && (
                        <>
                          <motion.div
                            className="h-full bg-green-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${(fair.pass / fair.totalChecked) * 100}%` }}
                            transition={{ duration: 0.5 }}
                          />
                          <motion.div
                            className="h-full bg-amber-400"
                            initial={{ width: 0 }}
                            animate={{ width: `${(fair.flag / fair.totalChecked) * 100}%` }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                          />
                          <motion.div
                            className="h-full bg-red-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${(fair.reject / fair.totalChecked) * 100}%` }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                          />
                        </>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">{fair.totalChecked} items checked</p>
                  </div>

                  {/* By category */}
                  {Object.keys(fair.byCategory).length > 0 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-medium text-slate-700">Results by Fairness Category</p>
                      </div>
                      <table className="w-full text-xs">
                        <thead className="text-slate-500 bg-slate-50">
                          <tr>
                            <th className="text-left px-4 py-2 font-medium">Category</th>
                            <th className="text-right px-4 py-2 font-medium text-green-700">Pass</th>
                            <th className="text-right px-4 py-2 font-medium text-amber-700">Flag</th>
                            <th className="text-right px-4 py-2 font-medium text-red-700">Reject</th>
                            <th className="px-4 py-2 font-medium w-28">Pass Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {Object.entries(fair.byCategory).map(([cat, counts]) => {
                            const total = counts.pass + counts.flag + counts.reject;
                            const passRate = total > 0 ? counts.pass / total : 0;
                            return (
                              <tr key={cat} className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-medium text-slate-700">{cat}</td>
                                <td className="px-4 py-2 text-right text-green-700 font-medium">{counts.pass}</td>
                                <td className="px-4 py-2 text-right text-amber-700 font-medium">{counts.flag}</td>
                                <td className="px-4 py-2 text-right text-red-700 font-medium">{counts.reject}</td>
                                <td className="px-4 py-2 w-28">
                                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div
                                      className={`h-full rounded-full ${passRate >= 0.9 ? "bg-green-500" : passRate >= 0.7 ? "bg-amber-400" : "bg-red-500"}`}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${passRate * 100}%` }}
                                      transition={{ duration: 0.5 }}
                                    />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <p className="text-xs text-slate-400 bg-slate-50 rounded-lg p-3">
                    Checks based on ETS Fairness Review Guidelines and ALTE Code of Practice.
                    Flagged/rejected items should be reviewed by a cultural-fairness expert before deployment.
                  </p>
                </>
              )}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
