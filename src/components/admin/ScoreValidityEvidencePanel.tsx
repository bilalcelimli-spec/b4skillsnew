/**
 * ScoreValidityEvidencePanel — Score validity and reliability evidence
 *
 * Synthesises score validity evidence per AERA/APA/NCME Standards (2014):
 *   - Content evidence (blueprint alignment, reviewed elsewhere)
 *   - Internal structure: Cronbach α, McDonald's ω, theta SEM by CEFR level
 *   - Convergent validity: within-skill score correlations
 *   - Discriminant validity: cross-skill correlations
 *   - Criterion-related validity: CEFR classification accuracy, kappa
 *
 * References:
 *   AERA/APA/NCME (2014). Standards for Educational and Psychological Testing.
 *   Cronbach (1951). Coefficient alpha and internal structure of tests.
 *   McDonald (1999). Test theory: A unified treatment.
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckSquare, AlertTriangle, BarChart3, Target, Layers, RefreshCw } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReliabilityRow {
  skill: string;
  cefrLevel: string;
  nSessions: number;
  cronbachAlpha: number;
  mcdonaldOmega: number;
  meanSEM: number;
  sdSEM: number;
  meanTheta: number;
  sdTheta: number;
}

interface SkillCorrelation {
  skillA: string;
  skillB: string;
  /** Pearson r between final theta estimates */
  pearsonR: number;
  nPairs: number;
  /** Expected: within-skill > cross-skill (discriminant validity) */
  type: "convergent" | "discriminant";
}

interface CEFRClassAccuracy {
  trueLevel: string;
  nTotal: number;
  nCorrect: number;
  nAdjacentCorrect: number;  // within ±1 level
  exactAccuracy: number;
  adjacentAccuracy: number;
  kappa: number;
}

interface ValidityPayload {
  nSessions: number;
  overallAlpha: number;
  overallOmega: number;
  meanSEM: number;
  classificationAccuracy: number;       // exact CEFR accuracy
  adjacentClassificationAccuracy: number;
  reliability: ReliabilityRow[];
  correlations: SkillCorrelation[];
  cefrAccuracy: CEFRClassAccuracy[];
  validityStatement: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AlphaGauge({ value }: { value: number }) {
  const color = value >= 0.8 ? "#22c55e" : value >= 0.7 ? "#f59e0b" : "#ef4444";
  const pct = Math.min(100, value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-24 h-2 bg-white/10 rounded-full overflow-hidden">
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono" style={{ color }}>{value.toFixed(3)}</span>
    </div>
  );
}

function CorrelationHeatmap({ data }: { data: SkillCorrelation[] }) {
  const skills = Array.from(new Set(data.flatMap((c) => [c.skillA, c.skillB]))).sort();
  const cellMap = new Map<string, number>();
  for (const c of data) {
    cellMap.set(`${c.skillA}|${c.skillB}`, c.pearsonR);
    cellMap.set(`${c.skillB}|${c.skillA}`, c.pearsonR);
  }
  for (const s of skills) cellMap.set(`${s}|${s}`, 1.0);

  const colorFor = (r: number) => {
    const pct = (r + 1) / 2;
    const h = 240 - pct * 240;
    return `hsl(${h}, 70%, 50%)`;
  };

  return (
    <div className="overflow-auto">
      <table className="text-xs">
        <thead>
          <tr>
            <th className="p-1 text-gray-500" />
            {skills.map((s) => <th key={s} className="p-1 text-gray-400 font-normal text-[10px] w-16">{s.slice(0, 5)}</th>)}
          </tr>
        </thead>
        <tbody>
          {skills.map((sa) => (
            <tr key={sa}>
              <td className="p-1 text-gray-400 text-[10px] pr-2">{sa.slice(0, 5)}</td>
              {skills.map((sb) => {
                const r = cellMap.get(`${sa}|${sb}`) ?? null;
                return (
                  <td key={sb} className="p-1 text-center w-16 h-8 rounded"
                    style={{ background: r !== null ? colorFor(r) : "transparent" }}>
                    {r !== null ? (
                      <span className="text-white text-[10px] font-mono font-bold drop-shadow">
                        {r === 1 ? "1.00" : r.toFixed(2)}
                      </span>
                    ) : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-gray-500 mt-2">
        Blue = high positive correlation (convergent). Red = low correlation (discriminant).
      </p>
    </div>
  );
}

function ClassificationChart({ data }: { data: CEFRClassAccuracy[] }) {
  const levels = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
  const ordered = levels.map((l) => data.find((d) => d.trueLevel === l)).filter(Boolean) as CEFRClassAccuracy[];
  return (
    <div className="overflow-auto rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-gray-400 border-b border-white/10">
            <th className="text-left p-3">CEFR Level</th>
            <th className="text-right p-3">N Sessions</th>
            <th className="text-right p-3">Exact Accuracy</th>
            <th className="text-right p-3">±1 Level Acc.</th>
            <th className="text-right p-3">κ (Kappa)</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((r) => (
            <tr key={r.trueLevel} className="border-b border-white/5 hover:bg-white/5">
              <td className="p-3 font-medium text-white">{r.trueLevel.replace("_", "")}</td>
              <td className="p-3 text-right text-gray-300">{r.nTotal}</td>
              <td className="p-3 text-right">
                <span className={`font-mono ${r.exactAccuracy >= 0.75 ? "text-green-400" : r.exactAccuracy >= 0.60 ? "text-yellow-400" : "text-red-400"}`}>
                  {(r.exactAccuracy * 100).toFixed(1)}%
                </span>
              </td>
              <td className="p-3 text-right">
                <span className={`font-mono ${r.adjacentAccuracy >= 0.90 ? "text-green-400" : "text-yellow-400"}`}>
                  {(r.adjacentAccuracy * 100).toFixed(1)}%
                </span>
              </td>
              <td className="p-3 text-right font-mono">
                <span className={r.kappa >= 0.6 ? "text-green-400" : r.kappa >= 0.4 ? "text-yellow-400" : "text-red-400"}>
                  {r.kappa.toFixed(3)}
                </span>
              </td>
            </tr>
          ))}
          {ordered.length === 0 && (
            <tr><td colSpan={5} className="p-8 text-center text-gray-500">No classification data available.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

type TabId = "reliability" | "correlations" | "classification" | "statement";

export function ScoreValidityEvidencePanel() {
  const [data, setData] = useState<ValidityPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("reliability");

  const load = () => {
    setLoading(true);
    setError(null);
    fetch("/api/psychometrics/score-validity")
      .then((r) => (r.ok ? r.json() : r.json().then((e: { error?: string }) => Promise.reject(e.error ?? "Error"))))
      .then((d: ValidityPayload) => { setData(d); setLoading(false); })
      .catch((e: string) => { setError(String(e)); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const kpis = data
    ? [
        { label: "Sessions", value: data.nSessions, icon: <BarChart3 size={16} />, color: "#6366f1", fmt: (v: number) => v.toLocaleString() },
        { label: "Cronbach α", value: data.overallAlpha, icon: <CheckSquare size={16} />, color: "#22c55e", fmt: (v: number) => v.toFixed(3) },
        { label: "Mean SEM (θ)", value: data.meanSEM, icon: <Target size={16} />, color: "#f59e0b", fmt: (v: number) => v.toFixed(3) },
        { label: "CEFR Accuracy", value: data.classificationAccuracy * 100, icon: <Layers size={16} />, color: "#06b6d4", fmt: (v: number) => `${v.toFixed(1)}%` },
      ]
    : [];

  const tabs: { id: TabId; label: string }[] = [
    { id: "reliability", label: "Reliability" },
    { id: "correlations", label: "Validity Matrix" },
    { id: "classification", label: "CEFR Accuracy" },
    { id: "statement", label: "Validity Statement" },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <RefreshCw size={20} className="animate-spin mr-2" />Loading validity evidence…
    </div>
  );
  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-red-400">
      <AlertTriangle size={20} /><span>{error}</span>
      <button onClick={load} className="px-3 py-1 text-xs bg-white/10 rounded hover:bg-white/20">Retry</button>
    </div>
  );
  if (!data) return null;

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Score Validity Evidence</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            AERA/APA/NCME Standards (2014) — reliability, validity, classification accuracy
          </p>
        </div>
        <button onClick={load} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white/5 rounded-xl p-4 border border-white/10">
            <div className="flex items-center gap-2 mb-2" style={{ color: k.color }}>
              {k.icon}
              <span className="text-xs text-gray-400">{k.label}</span>
            </div>
            <div className="text-2xl font-bold text-white">{k.fmt(k.value as number)}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-white/5 rounded-lg w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === t.id ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Reliability Table */}
        {activeTab === "reliability" && (
          <motion.div key="reliability" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="overflow-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-white/10">
                    <th className="text-left p-3">Skill</th>
                    <th className="text-left p-3">Level</th>
                    <th className="text-right p-3">N</th>
                    <th className="text-left p-3">Cronbach α</th>
                    <th className="text-left p-3">ω</th>
                    <th className="text-right p-3">Mean SEM</th>
                    <th className="text-right p-3">Mean θ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.reliability.map((r, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-3 font-medium text-white">{r.skill}</td>
                      <td className="p-3 text-gray-300">{r.cefrLevel.replace("_", "")}</td>
                      <td className="p-3 text-right text-gray-300">{r.nSessions}</td>
                      <td className="p-3"><AlphaGauge value={r.cronbachAlpha} /></td>
                      <td className="p-3"><AlphaGauge value={r.mcdonaldOmega} /></td>
                      <td className="p-3 text-right font-mono text-gray-300">{r.meanSEM.toFixed(3)}</td>
                      <td className="p-3 text-right font-mono text-gray-300">{r.meanTheta > 0 ? "+" : ""}{r.meanTheta.toFixed(2)}</td>
                    </tr>
                  ))}
                  {data.reliability.length === 0 && (
                    <tr><td colSpan={7} className="p-8 text-center text-gray-500">Insufficient data.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="mt-3 p-3 bg-white/5 rounded-lg text-xs text-gray-400">
              Target: α ≥ 0.80 (high-stakes), α ≥ 0.70 (research). McDonald's ω accounts for non-tau-equivalence.
              SEM = σ√(1 − α); lower SEM = higher precision at that ability level.
            </div>
          </motion.div>
        )}

        {/* Convergent/Discriminant Validity Matrix */}
        {activeTab === "correlations" && (
          <motion.div key="correlations" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-sm font-medium text-white mb-1">Skill Correlation Matrix</h3>
              <p className="text-xs text-gray-400 mb-4">
                Pearson r between final θ estimates across skills. High within-skill (convergent) and lower
                cross-skill (discriminant) correlations support construct validity (Campbell & Fiske, 1959).
              </p>
              <CorrelationHeatmap data={data.correlations} />
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="bg-white/5 rounded p-3">
                  <div className="text-gray-400 font-medium mb-1">Convergent correlations</div>
                  {data.correlations.filter((c) => c.type === "convergent").map((c) => (
                    <div key={`${c.skillA}-${c.skillB}`} className="flex justify-between">
                      <span className="text-gray-400">{c.skillA} ↔ {c.skillB}</span>
                      <span className={`font-mono ${c.pearsonR >= 0.5 ? "text-green-400" : "text-yellow-400"}`}>{c.pearsonR.toFixed(3)}</span>
                    </div>
                  ))}
                  {data.correlations.filter((c) => c.type === "convergent").length === 0 && (
                    <span className="text-gray-600">—</span>
                  )}
                </div>
                <div className="bg-white/5 rounded p-3">
                  <div className="text-gray-400 font-medium mb-1">Discriminant correlations</div>
                  {data.correlations.filter((c) => c.type === "discriminant").slice(0, 6).map((c) => (
                    <div key={`${c.skillA}-${c.skillB}`} className="flex justify-between">
                      <span className="text-gray-400">{c.skillA.slice(0, 4)} ↔ {c.skillB.slice(0, 4)}</span>
                      <span className={`font-mono ${c.pearsonR < 0.4 ? "text-green-400" : "text-yellow-400"}`}>{c.pearsonR.toFixed(3)}</span>
                    </div>
                  ))}
                  {data.correlations.filter((c) => c.type === "discriminant").length === 0 && (
                    <span className="text-gray-600">—</span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* CEFR Classification Accuracy */}
        {activeTab === "classification" && (
          <motion.div key="classification" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="mb-4 p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-gray-400">Exact CEFR Accuracy: </span>
                  <span className={`font-bold ${data.classificationAccuracy >= 0.75 ? "text-green-400" : data.classificationAccuracy >= 0.60 ? "text-yellow-400" : "text-red-400"}`}>
                    {(data.classificationAccuracy * 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">±1 Level Accuracy: </span>
                  <span className={`font-bold ${data.adjacentClassificationAccuracy >= 0.90 ? "text-green-400" : "text-yellow-400"}`}>
                    {(data.adjacentClassificationAccuracy * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
            <ClassificationChart data={data.cefrAccuracy} />
            <div className="mt-3 p-3 bg-white/5 rounded-lg text-xs text-gray-400">
              Exact accuracy target: ≥ 75% (operational). ±1 level: ≥ 90%.
              κ ≥ 0.61: substantial agreement. κ ≥ 0.41: moderate (Landis & Koch, 1977).
            </div>
          </motion.div>
        )}

        {/* Validity Statement */}
        {activeTab === "statement" && (
          <motion.div key="statement" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="space-y-4">
              <div className="bg-white/5 rounded-xl p-5 border border-white/10">
                <h3 className="text-sm font-semibold text-white mb-3">Automated Validity Summary</h3>
                <p className="text-sm text-gray-300 leading-relaxed">{data.validityStatement}</p>
              </div>
              {[
                {
                  title: "Evidence of Internal Structure (AERA Standard 1.13)",
                  body: `Cronbach α and McDonald's ω computed for each skill × CEFR stratum. IRT dimensionality supported by model fit indices (RMSEA, CFI) on the item bank. Theta estimates from 3PL CAT represent a unidimensional latent trait within each skill domain.`,
                  color: "#6366f1",
                },
                {
                  title: "Convergent & Discriminant Validity (Standard 1.14)",
                  body: `Inter-skill theta correlations examined for MTMM pattern. Receptive skills (Reading, Listening) expected r > 0.5. Productive skills (Writing, Speaking) expected moderate–high within-cluster. Cross-cluster (e.g., Vocabulary ↔ Speaking) expected lower, supporting discriminant validity.`,
                  color: "#22c55e",
                },
                {
                  title: "Criterion-Related Validity (Standard 1.15)",
                  body: `External criterion: CEFR classification assigned by the adaptive stopping rule (theta-based boundary). Classification accuracy versus teacher/institutional records where available. Cohen's κ reported per CEFR level as the primary criterion-validity index.`,
                  color: "#f59e0b",
                },
                {
                  title: "Consequential Validity (Standard 1.24)",
                  body: `Score use decisions (placement, certification, progression) are reviewed against this evidence annually. If classification accuracy falls below 75% for any level with n > 100, a psychometric review is triggered. All validity evidence archived for regulatory audit.`,
                  color: "#06b6d4",
                },
              ].map((s) => (
                <div key={s.title} className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-sm font-semibold mb-2" style={{ color: s.color }}>{s.title}</div>
                  <p className="text-sm text-gray-400 leading-relaxed">{s.body}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
