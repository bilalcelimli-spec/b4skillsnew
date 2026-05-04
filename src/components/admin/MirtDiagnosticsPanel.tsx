/**
 * MIRT Diagnostics Panel
 *
 * Admin UI for the 6-dimensional Multidimensional IRT ability estimates
 * across the candidate pool.
 *
 * Displays:
 *   - Population-level mean θ ± 1 SD per skill dimension (hexagonal radar + bar)
 *   - Inter-skill correlation heatmap (from PRIOR_CORRELATION matrix)
 *   - Per-candidate MIRT ability vector for recent sessions
 *
 * References:
 *   Reckase (2009), Multidimensional Item Response Theory
 *   Ockey (2014), Cross-linguistic correlations in L2 assessment
 */

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { RefreshCw, BarChart3 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MirtSnapshot {
  dim0Avg: number; dim0Std: number; // READING
  dim1Avg: number; dim1Std: number; // LISTENING
  dim2Avg: number; dim2Std: number; // WRITING
  dim3Avg: number; dim3Std: number; // SPEAKING
  dim4Avg: number; dim4Std: number; // GRAMMAR
  dim5Avg: number; dim5Std: number; // VOCABULARY
}

interface CandidateMirt {
  sessionId: string;
  candidateName?: string;
  completedAt: string;
  vector: number[]; // [read, listen, write, speak, grammar, vocab]
}

interface MirtData {
  population: MirtSnapshot;
  candidates: CandidateMirt[];
  sampleSize: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SKILLS = ["Reading", "Listening", "Writing", "Speaking", "Grammar", "Vocabulary"];
const SKILL_COLORS = [
  "#4f46e5", // Reading — indigo
  "#0891b2", // Listening — cyan
  "#059669", // Writing — emerald
  "#d97706", // Speaking — amber
  "#7c3aed", // Grammar — violet
  "#db2777", // Vocabulary — pink
];

/** Prior inter-skill correlation matrix (Ockey 2014, In'nami 2012) */
const PRIOR_CORR = [
  [1.00, 0.65, 0.60, 0.45, 0.72, 0.75],
  [0.65, 1.00, 0.50, 0.55, 0.58, 0.60],
  [0.60, 0.50, 1.00, 0.65, 0.68, 0.55],
  [0.45, 0.55, 0.65, 1.00, 0.50, 0.48],
  [0.72, 0.58, 0.68, 0.50, 1.00, 0.78],
  [0.75, 0.60, 0.55, 0.48, 0.78, 1.00],
];

function corrColor(r: number) {
  const alpha = 0.2 + Math.abs(r) * 0.8;
  return `rgba(79, 70, 229, ${alpha})`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MirtDiagnosticsPanel() {
  const [data, setData]     = useState<MirtData | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab]       = useState<"population" | "candidates" | "correlations">("population");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/psychometrics/mirt-snapshot", { credentials: "include" });
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const pop = data?.population;
  const dims = pop ? [
    { label: "Reading",    avg: pop.dim0Avg, std: pop.dim0Std },
    { label: "Listening",  avg: pop.dim1Avg, std: pop.dim1Std },
    { label: "Writing",    avg: pop.dim2Avg, std: pop.dim2Std },
    { label: "Speaking",   avg: pop.dim3Avg, std: pop.dim3Std },
    { label: "Grammar",    avg: pop.dim4Avg, std: pop.dim4Std },
    { label: "Vocabulary", avg: pop.dim5Avg, std: pop.dim5Std },
  ] : [];

  const TABS = [
    { id: "population"   as const, label: "Population Profile" },
    { id: "candidates"   as const, label: "Candidate Vectors" },
    { id: "correlations" as const, label: "Skill Correlations" },
  ];

  // Normalise theta → 0-100 scale for display (θ ∈ [-3, +3])
  const pct = (theta: number) => Math.round(Math.max(0, Math.min(100, ((theta + 3) / 6) * 100)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">MIRT 6D Diagnostics</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Compensatory MIRT — population ability profiles across six skill dimensions
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-slate-400 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Tab bar */}
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
        {data && (
          <span className="ml-auto text-xs text-slate-400 self-center pr-1">
            n = {data.sampleSize}
          </span>
        )}
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
        </div>
      ) : !data ? (
        <div className="text-center py-12 text-slate-400 text-sm">No MIRT data available yet.</div>
      ) : (
        <>
          {/* ── POPULATION PROFILE ─────────────────────────────────────────── */}
          {tab === "population" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-slate-500" />
                  <p className="text-sm font-medium text-slate-700">Mean θ ± 1 SD by Skill Dimension</p>
                </div>
                <div className="p-4 space-y-3">
                  {dims.map((d, i) => (
                    <div key={d.label} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-slate-700 w-20 flex-shrink-0">{d.label}</span>
                      <div className="flex-1 relative h-7">
                        {/* Background track */}
                        <div className="absolute inset-y-0 left-0 right-0 bg-slate-100 rounded-full my-2" />
                        {/* SD band */}
                        <motion.div
                          className="absolute inset-y-1 rounded-full opacity-30"
                          style={{ backgroundColor: SKILL_COLORS[i] }}
                          initial={{ left: "50%", right: "50%" }}
                          animate={{
                            left: `${pct(d.avg - d.std)}%`,
                            right: `${100 - pct(d.avg + d.std)}%`,
                          }}
                          transition={{ duration: 0.6 }}
                        />
                        {/* Mean marker */}
                        <motion.div
                          className="absolute top-0 bottom-0 w-0.5 rounded"
                          style={{ backgroundColor: SKILL_COLORS[i] }}
                          initial={{ left: "50%" }}
                          animate={{ left: `${pct(d.avg)}%` }}
                          transition={{ duration: 0.6 }}
                        />
                      </div>
                      <div className="text-xs font-mono text-right flex-shrink-0 w-20">
                        <span className="font-semibold text-slate-800">{d.avg >= 0 ? "+" : ""}{d.avg.toFixed(2)}</span>
                        <span className="text-slate-400"> ±{d.std.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
                    θ scale: −3 (very low) to +3 (very high). Band = ±1 SD.
                    CEFR ≈ A1:−2.5, A2:−1.5, B1:−0.5, B2:+0.5, C1:+1.5, C2:+2.5
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── CANDIDATE VECTORS ──────────────────────────────────────────── */}
          {tab === "candidates" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {data.candidates.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-sm">No completed sessions with MIRT vectors yet.</p>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                        <tr>
                          <th className="text-left px-4 py-2.5 font-medium">Candidate</th>
                          <th className="text-left px-4 py-2.5 font-medium">Date</th>
                          {SKILLS.map((s, i) => (
                            <th key={s} className="text-right px-3 py-2.5 font-medium" style={{ color: SKILL_COLORS[i] }}>
                              {s.slice(0, 4)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.candidates.map((c) => (
                          <tr key={c.sessionId} className="hover:bg-slate-50">
                            <td className="px-4 py-2 font-medium text-slate-700">
                              {c.candidateName ?? c.sessionId.slice(0, 8) + "…"}
                            </td>
                            <td className="px-4 py-2 text-slate-500">
                              {new Date(c.completedAt).toLocaleDateString()}
                            </td>
                            {c.vector.map((v, i) => (
                              <td key={i} className="px-3 py-2 text-right font-mono"
                                style={{ color: SKILL_COLORS[i] }}>
                                {v >= 0 ? "+" : ""}{v.toFixed(2)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── SKILL CORRELATIONS ─────────────────────────────────────────── */}
          {tab === "correlations" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-medium text-slate-700">Prior Inter-Skill Correlation Matrix</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Based on Ockey (2014), In'nami &amp; Koizumi (2012) L2 assessment research
                  </p>
                </div>
                <div className="p-4 overflow-x-auto">
                  <table className="text-xs border-collapse mx-auto">
                    <thead>
                      <tr>
                        <th className="p-1 w-20" />
                        {SKILLS.map((s, i) => (
                          <th key={s} className="p-1 text-center font-medium w-16" style={{ color: SKILL_COLORS[i] }}>
                            {s.slice(0, 4)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {SKILLS.map((rowSkill, i) => (
                        <tr key={rowSkill}>
                          <td className="p-1 text-right font-medium pr-2" style={{ color: SKILL_COLORS[i] }}>
                            {rowSkill.slice(0, 4)}
                          </td>
                          {PRIOR_CORR[i].map((r, j) => (
                            <td key={j} className="p-0.5">
                              <div
                                className="w-14 h-7 rounded flex items-center justify-center text-xs font-mono font-semibold"
                                style={{
                                  backgroundColor: i === j ? "#1e1b4b" : corrColor(r),
                                  color: i === j || r > 0.6 ? "white" : "#1e293b",
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
                  <p className="text-xs text-slate-400 mt-3">
                    These priors are used to regularise the MIRT covariance during EAP estimation.
                    Grammar–Vocabulary correlation (0.78) is highest; Reading–Speaking (0.45) lowest.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
