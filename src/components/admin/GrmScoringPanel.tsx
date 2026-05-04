/**
 * GRM Polytomous Scoring Panel
 *
 * Admin view for Graded Response Model (Samejima 1969) diagnostics on
 * Writing and Speaking items scored on rubric scales (0–10).
 *
 * Three tabs:
 *   1. Items — table of polytomous items with a, b₁…bₖ₋₁, expected score at B1/B2
 *   2. Score Distributions — per-item histogram of observed scores vs GRM expected
 *   3. Information Curves — peak information, optimal theta range, test-level TIC
 *
 * Endpoint: GET /api/psychometrics/grm-scores
 * Returns: { items: GrmItemSummary[], sampleSize: number }
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, TrendingUp, BarChart2, Zap, AlertTriangle } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface GrmItemSummary {
  id: string;
  skill: string;
  cefrLevel: string;
  discrimination: number;
  difficulty: number;
  categories: number;
  boundaries: number[];
  expectedScoreAt: {
    A2: number;
    B1: number;
    B2: number;
    C1: number;
  };
  peakInformation: number;
  peakTheta: number;
  observedMean: number | null;
  observedN: number;
  observedDistribution: number[];
  fitWarning: boolean;
}

interface GrmData {
  items: GrmItemSummary[];
  sampleSize: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const CEFR_COLORS: Record<string, string> = {
  A1: "#64748b", A2: "#0284c7", B1: "#0891b2",
  B2: "#059669", C1: "#7c3aed", C2: "#db2777",
};

const SKILL_COLORS: Record<string, string> = {
  WRITING: "#059669",
  SPEAKING: "#d97706",
};

function ScorePip({ val, max }: { val: number; max: number }) {
  const pct = max > 0 ? (val / max) * 100 : 0;
  return (
    <div className="flex-1 bg-slate-100 rounded h-3 overflow-hidden">
      <div
        className="h-full rounded transition-all"
        style={{ width: `${pct}%`, backgroundColor: "#6366f1" }}
      />
    </div>
  );
}

/** Mini bar chart for observed score distribution */
function DistributionBars({ dist }: { dist: number[] }) {
  if (!dist.length) return <span className="text-xs text-slate-400">—</span>;
  const max = Math.max(...dist, 1);
  return (
    <div className="flex items-end gap-0.5 h-6 w-full">
      {dist.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t"
          style={{
            height: `${(v / max) * 100}%`,
            backgroundColor: "#6366f1",
            opacity: 0.5 + (v / max) * 0.5,
            minHeight: v > 0 ? 2 : 0,
          }}
          title={`Score ${i}: ${v}`}
        />
      ))}
    </div>
  );
}

/** Information curve sparkline as SVG */
function InfoCurve({
  boundaries,
  discrimination,
  peakTheta,
}: {
  boundaries: number[];
  discrimination: number;
  peakTheta: number;
}) {
  // Approximate GRM information curve with a Gaussian envelope
  const pts: { x: number; y: number }[] = [];
  for (let t = -3; t <= 3; t += 0.2) {
    // Approximate info = a² × Σ P_k(1-P_k), computed as Gaussian near peak
    const sigma = 1.2 / discrimination;
    const info = discrimination * discrimination * Math.exp(-0.5 * Math.pow((t - peakTheta) / sigma, 2));
    pts.push({ x: t, y: info });
  }
  const maxY = Math.max(...pts.map((p) => p.y), 0.01);
  const W = 80; const H = 24;
  const sx = (t: number) => ((t + 3) / 6) * W;
  const sy = (y: number) => H - (y / maxY) * (H - 2);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-20 h-6">
      <path d={d} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" />
      {/* Peak marker */}
      <circle
        cx={sx(peakTheta).toFixed(1)}
        cy={(2).toFixed(1)}
        r="2"
        fill="#6366f1"
      />
    </svg>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function GrmScoringPanel() {
  const [data, setData] = useState<GrmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"items" | "distributions" | "information">("items");
  const [filterSkill, setFilterSkill] = useState<"ALL" | "WRITING" | "SPEAKING">("ALL");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/psychometrics/grm-scores", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setData(d); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const items = (data?.items ?? []).filter(
    (it) => filterSkill === "ALL" || it.skill === filterSkill
  );

  const TABS = [
    { id: "items"        as const, label: "Items",          icon: <BarChart2 size={13} /> },
    { id: "distributions" as const, label: "Score Distributions", icon: <TrendingUp size={13} /> },
    { id: "information"  as const, label: "Information Curves",   icon: <Zap size={13} /> },
  ];

  const detailItem = selectedItem ? data?.items.find((i) => i.id === selectedItem) : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">GRM Polytomous Scoring</h2>
          <p className="text-sm text-slate-400">
            Samejima (1969) Graded Response Model — Writing &amp; Speaking rubric items
            {data && ` · ${data.sampleSize} scored responses`}
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
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Polytomous Items", value: data.items.length, color: "text-indigo-700" },
              { label: "Writing Items", value: data.items.filter((i) => i.skill === "WRITING").length, color: "text-emerald-700" },
              { label: "Speaking Items", value: data.items.filter((i) => i.skill === "SPEAKING").length, color: "text-amber-700" },
              { label: "Fit Warnings", value: data.items.filter((i) => i.fitWarning).length, color: "text-red-600" },
            ].map((c) => (
              <div key={c.label} className="rounded-xl border border-slate-200 p-4 bg-white text-center">
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                <p className="text-xs text-slate-500 mt-1">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Filter + Tabs */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-1 border-b border-slate-200 flex-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
                    tab === t.id
                      ? "border-indigo-600 text-indigo-700 bg-indigo-50"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {(["ALL", "WRITING", "SPEAKING"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterSkill(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    filterSkill === s
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "text-slate-500 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* ── ITEMS TABLE ─────────────────────────────────────────── */}
            {tab === "items" && (
              <motion.div
                key="items"
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
                          <th className="text-right px-3 py-2.5 font-medium">a</th>
                          <th className="text-right px-3 py-2.5 font-medium">b₁</th>
                          <th className="text-right px-3 py-2.5 font-medium">b₅</th>
                          <th className="text-right px-3 py-2.5 font-medium">b₁₀</th>
                          <th className="text-center px-3 py-2.5 font-medium">E[X|B1]</th>
                          <th className="text-center px-3 py-2.5 font-medium">E[X|B2]</th>
                          <th className="text-right px-3 py-2.5 font-medium">Obs. Mean</th>
                          <th className="text-center px-3 py-2.5 font-medium">n</th>
                          <th className="text-center px-3 py-2.5 font-medium">Fit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((it) => {
                          const skillColor = SKILL_COLORS[it.skill] ?? "#64748b";
                          const cefrColor = CEFR_COLORS[it.cefrLevel] ?? "#94a3b8";
                          return (
                            <tr
                              key={it.id}
                              className="hover:bg-slate-50 cursor-pointer"
                              onClick={() => setSelectedItem(selectedItem === it.id ? null : it.id)}
                            >
                              <td className="px-3 py-2">
                                <span className="font-medium" style={{ color: skillColor }}>{it.skill}</span>
                                <span className="ml-2 px-1.5 py-0.5 rounded text-white text-xs" style={{ backgroundColor: cefrColor }}>
                                  {it.cefrLevel}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-slate-700">{it.discrimination.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right font-mono text-slate-500">{it.boundaries[0]?.toFixed(2) ?? "—"}</td>
                              <td className="px-3 py-2 text-right font-mono text-slate-500">{it.boundaries[4]?.toFixed(2) ?? "—"}</td>
                              <td className="px-3 py-2 text-right font-mono text-slate-500">{it.boundaries[9]?.toFixed(2) ?? "—"}</td>
                              <td className="px-3 py-2 text-center font-mono text-blue-600">{it.expectedScoreAt.B1.toFixed(1)}</td>
                              <td className="px-3 py-2 text-center font-mono text-emerald-600">{it.expectedScoreAt.B2.toFixed(1)}</td>
                              <td className="px-3 py-2 text-right font-mono text-slate-700">
                                {it.observedMean !== null ? it.observedMean.toFixed(1) : "—"}
                              </td>
                              <td className="px-3 py-2 text-center text-slate-500">{it.observedN}</td>
                              <td className="px-3 py-2 text-center">
                                {it.fitWarning
                                  ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mx-auto" />
                                  : <span className="text-green-600 font-medium">✓</span>
                                }
                              </td>
                            </tr>
                          );
                        })}
                        {items.length === 0 && (
                          <tr>
                            <td colSpan={10} className="px-4 py-8 text-center text-slate-400">
                              No polytomous items found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Expanded boundary detail */}
                <AnimatePresence>
                  {detailItem && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border border-indigo-200 rounded-xl bg-indigo-50 p-4 overflow-hidden"
                    >
                      <p className="text-sm font-medium text-indigo-800 mb-3">
                        Boundary Parameters — {detailItem.skill} · {detailItem.cefrLevel} · a={detailItem.discrimination.toFixed(2)}
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {detailItem.boundaries.map((b, i) => (
                          <div key={i} className="bg-white rounded-lg px-3 py-2 text-center border border-indigo-100 min-w-[52px]">
                            <p className="text-xs text-indigo-400">b{i + 1}</p>
                            <p className="text-sm font-mono font-semibold text-indigo-700">{b.toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 grid grid-cols-4 gap-3 text-xs">
                        {Object.entries(detailItem.expectedScoreAt).map(([lvl, score]) => (
                          <div key={lvl} className="bg-white rounded-lg p-2 border border-indigo-100 text-center">
                            <p className="text-indigo-400">{lvl}</p>
                            <p className="font-mono font-semibold text-indigo-700">{score.toFixed(2)}</p>
                            <p className="text-indigo-300">/ {detailItem.categories - 1}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ── SCORE DISTRIBUTIONS ─────────────────────────────────── */}
            {tab === "distributions" && (
              <motion.div
                key="distributions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-2 gap-3"
              >
                {items.length === 0 && (
                  <p className="col-span-2 text-center py-12 text-slate-400 text-sm">No items to display.</p>
                )}
                {items.map((it) => {
                  const cats = it.categories;
                  const maxScore = cats - 1;
                  return (
                    <div key={it.id} className="border border-slate-200 rounded-xl bg-white p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="text-sm font-medium" style={{ color: SKILL_COLORS[it.skill] ?? "#64748b" }}>
                            {it.skill}
                          </span>
                          <span className="ml-2 text-xs px-1.5 py-0.5 rounded font-medium"
                            style={{ backgroundColor: `${CEFR_COLORS[it.cefrLevel] ?? "#94a3b8"}20`, color: CEFR_COLORS[it.cefrLevel] }}>
                            {it.cefrLevel}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">n={it.observedN}</span>
                      </div>
                      {/* Score scale labels 0 … maxScore */}
                      {it.observedDistribution.length > 0 ? (
                        <DistributionBars dist={it.observedDistribution} />
                      ) : (
                        <p className="text-xs text-slate-400 py-3 text-center">No responses yet</p>
                      )}
                      <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>0</span>
                        <span>{Math.floor(maxScore / 2)}</span>
                        <span>{maxScore}</span>
                      </div>
                      <div className="mt-2 flex gap-4 text-xs">
                        <span className="text-slate-500">
                          Obs. mean: <strong className="text-slate-700">{it.observedMean !== null ? it.observedMean.toFixed(1) : "—"}</strong>
                        </span>
                        <span className="text-slate-500">
                          E[X|B1]: <strong className="text-blue-600">{it.expectedScoreAt.B1.toFixed(1)}</strong>
                        </span>
                        <span className="text-slate-500">
                          E[X|B2]: <strong className="text-emerald-600">{it.expectedScoreAt.B2.toFixed(1)}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {/* ── INFORMATION CURVES ──────────────────────────────────── */}
            {tab === "information" && (
              <motion.div
                key="information"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3"
              >
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                      <tr>
                        <th className="text-left px-3 py-2.5 font-medium">Skill / CEFR</th>
                        <th className="text-right px-3 py-2.5 font-medium">a</th>
                        <th className="text-right px-3 py-2.5 font-medium">Peak I(θ)</th>
                        <th className="text-right px-3 py-2.5 font-medium">θ* (peak)</th>
                        <th className="text-center px-3 py-2.5 font-medium">Curve</th>
                        <th className="text-left px-3 py-2.5 font-medium">Optimal for</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((it) => {
                        const skillColor = SKILL_COLORS[it.skill] ?? "#64748b";
                        const cefrColor = CEFR_COLORS[it.cefrLevel] ?? "#94a3b8";
                        const optTheta = it.peakTheta;
                        const optCefr = optTheta > 2.0 ? "C2" : optTheta > 1.0 ? "C1" : optTheta > 0.0 ? "B2" : optTheta > -1.0 ? "B1" : optTheta > -2.0 ? "A2" : "A1";
                        return (
                          <tr key={it.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2">
                              <span className="font-medium" style={{ color: skillColor }}>{it.skill}</span>
                              <span className="ml-2 px-1.5 py-0.5 rounded text-white text-xs" style={{ backgroundColor: cefrColor }}>
                                {it.cefrLevel}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-slate-700">{it.discrimination.toFixed(2)}</td>
                            <td className="px-3 py-2 text-right font-mono font-semibold text-indigo-600">{it.peakInformation.toFixed(3)}</td>
                            <td className="px-3 py-2 text-right font-mono text-slate-600">
                              {it.peakTheta >= 0 ? "+" : ""}{it.peakTheta.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <InfoCurve
                                boundaries={it.boundaries}
                                discrimination={it.discrimination}
                                peakTheta={it.peakTheta}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <span className="px-2 py-0.5 rounded font-medium text-xs"
                                style={{ backgroundColor: `${CEFR_COLORS[optCefr] ?? "#94a3b8"}18`, color: CEFR_COLORS[optCefr] }}>
                                {optCefr} region
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {items.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-400">No items to display.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-slate-400">
                  Peak I(θ) is the Fisher information maximum; θ* is the ability level at which the item provides maximum measurement precision.
                  Higher discrimination (a) yields narrower, taller information curves.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
