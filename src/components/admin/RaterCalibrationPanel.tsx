/**
 * RaterCalibrationPanel — Many-Facets Rasch Model (MFRM) rater calibration
 *
 * Linacre (1994) MFRM framework: rater severity/leniency estimation,
 * infit/outfit MNSQ, inter-rater reliability (QWK), arbitration monitoring.
 *
 * References:
 *   Linacre, J.M. (1994). Many-facet Rasch measurement. MESA Press.
 *   Myford & Wolfe (2003). Detecting and measuring rater effects using MFRM. JEBS.
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UserCheck, AlertTriangle, TrendingUp, TrendingDown, Award, BarChart3, RefreshCw } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RaterStats {
  raterId: string;
  raterLabel: string;
  nRatings: number;
  meanScore: number;
  sdScore: number;
  /** Severity logit: positive = more severe than average */
  severityLogit: number;
  /** Infit MNSQ (expected ~1.0, flag if >1.3 or <0.7) */
  infitMNSQ: number;
  /** Outfit MNSQ */
  outfitMNSQ: number;
  meanQWK: number;
  arbitrationRate: number;
  /** "SEVERE" | "LENIENT" | "CENTRAL" | "ERRATIC" */
  severityFlag: string;
  infitFlag: boolean;
}

interface SeverityBin {
  bin: string;
  count: number;
}

interface RaterCalibPayload {
  nRaters: number;
  nRatings: number;
  meanQWK: number;
  arbitrationRate: number;
  grandMeanScore: number;
  raters: RaterStats[];
  severityDist: SeverityBin[];
  flagged: number;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SeverityBar({ logit, max = 2 }: { logit: number; max?: number }) {
  const clamped = Math.max(-max, Math.min(max, logit));
  const pct = ((clamped + max) / (2 * max)) * 100;
  const color = logit > 0.5 ? "#ef4444" : logit < -0.5 ? "#3b82f6" : "#22c55e";
  return (
    <div className="relative w-32 h-4 bg-white/10 rounded overflow-hidden flex items-center">
      {/* centre line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/30" />
      <div
        className="absolute top-1 bottom-1 rounded"
        style={{ left: `${Math.min(50, pct)}%`, width: `${Math.abs(pct - 50)}%`, background: color }}
      />
    </div>
  );
}

function MNSQBadge({ mnsq }: { mnsq: number }) {
  const flag = mnsq > 1.3 || mnsq < 0.7;
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-xs font-mono ${
        flag ? "bg-red-500/20 text-red-300" : "bg-green-500/20 text-green-300"
      }`}
    >
      {mnsq.toFixed(2)}
    </span>
  );
}

function SeverityBarChart({ data }: { data: SeverityBin[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1 h-28">
      {data.map((d) => (
        <div key={d.bin} className="flex flex-col items-center gap-1 flex-1">
          <div
            className="w-full rounded-t"
            style={{ height: `${(d.count / max) * 96}px`, background: "#6366f1" }}
          />
          <span className="text-[9px] text-gray-400 truncate w-full text-center">{d.bin}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type TabId = "raters" | "severity" | "fit" | "policy";

export function RaterCalibrationPanel() {
  const [data, setData] = useState<RaterCalibPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("raters");
  const [sortField, setSortField] = useState<keyof RaterStats>("severityLogit");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterFlagged, setFilterFlagged] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    fetch("/api/psychometrics/rater-calibration")
      .then((r) => (r.ok ? r.json() : r.json().then((e: { error?: string }) => Promise.reject(e.error ?? "Error"))))
      .then((d: RaterCalibPayload) => { setData(d); setLoading(false); })
      .catch((e: string) => { setError(String(e)); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const kpis = data
    ? [
        { label: "Raters", value: data.nRaters, icon: <UserCheck size={16} />, color: "#6366f1", fmt: String },
        { label: "Mean QWK", value: data.meanQWK, icon: <Award size={16} />, color: "#22c55e", fmt: (v: number) => v.toFixed(3) },
        { label: "Arbitration Rate", value: data.arbitrationRate * 100, icon: <AlertTriangle size={16} />, color: "#f59e0b", fmt: (v: number) => `${v.toFixed(1)}%` },
        { label: "Flagged Raters", value: data.flagged, icon: <BarChart3 size={16} />, color: "#ef4444", fmt: String },
      ]
    : [];

  const tabs: { id: TabId; label: string }[] = [
    { id: "raters", label: "Rater Table" },
    { id: "severity", label: "Severity Dist." },
    { id: "fit", label: "Fit Statistics" },
    { id: "policy", label: "MFRM Policy" },
  ];

  const sorted = data
    ? [...data.raters]
        .filter((r) => !filterFlagged || r.severityFlag !== "CENTRAL" || r.infitFlag)
        .sort((a, b) => {
          const av = a[sortField] as number, bv = b[sortField] as number;
          return sortDir === "asc" ? av - bv : bv - av;
        })
    : [];

  const toggleSort = (field: keyof RaterStats) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <RefreshCw size={20} className="animate-spin mr-2" />Loading rater calibration…
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
          <h2 className="text-xl font-bold text-white">Rater Calibration (MFRM)</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Many-Facets Rasch Model — rater severity, infit/outfit MNSQ, inter-rater reliability
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
        {/* Rater Table */}
        {activeTab === "raters" && (
          <motion.div key="raters" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-3 mb-3">
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                <input type="checkbox" checked={filterFlagged} onChange={(e) => setFilterFlagged(e.target.checked)} className="rounded" />
                Show flagged only
              </label>
              <span className="text-xs text-gray-500">{sorted.length} raters</span>
            </div>
            <div className="overflow-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-white/10">
                    <th className="text-left p-3">Rater</th>
                    <th className="text-right p-3 cursor-pointer hover:text-white" onClick={() => toggleSort("nRatings")}>N Ratings{sortField === "nRatings" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}</th>
                    <th className="text-right p-3 cursor-pointer hover:text-white" onClick={() => toggleSort("meanScore")}>Mean Score{sortField === "meanScore" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}</th>
                    <th className="text-center p-3 cursor-pointer hover:text-white" onClick={() => toggleSort("severityLogit")}>Severity Logit{sortField === "severityLogit" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}</th>
                    <th className="text-right p-3 cursor-pointer hover:text-white" onClick={() => toggleSort("meanQWK")}>QWK{sortField === "meanQWK" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}</th>
                    <th className="text-right p-3">Infit</th>
                    <th className="text-center p-3">Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r) => (
                    <tr key={r.raterId} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-3">
                        <div className="font-medium text-white">{r.raterLabel}</div>
                        <div className="text-xs text-gray-500">{r.raterId.slice(0, 8)}</div>
                      </td>
                      <td className="p-3 text-right text-gray-300">{r.nRatings}</td>
                      <td className="p-3 text-right text-gray-300">{r.meanScore.toFixed(2)}</td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-2">
                          <SeverityBar logit={r.severityLogit} />
                          <span className="text-xs font-mono text-gray-300 w-12 text-right">
                            {r.severityLogit > 0 ? "+" : ""}{r.severityLogit.toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <span className={`font-mono text-sm ${r.meanQWK >= 0.7 ? "text-green-400" : r.meanQWK >= 0.5 ? "text-yellow-400" : "text-red-400"}`}>
                          {r.meanQWK.toFixed(3)}
                        </span>
                      </td>
                      <td className="p-3 text-right"><MNSQBadge mnsq={r.infitMNSQ} /></td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          r.severityFlag === "SEVERE" ? "bg-red-500/20 text-red-300" :
                          r.severityFlag === "LENIENT" ? "bg-blue-500/20 text-blue-300" :
                          r.severityFlag === "ERRATIC" ? "bg-orange-500/20 text-orange-300" :
                          "bg-green-500/20 text-green-300"
                        }`}>
                          {r.severityFlag}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {sorted.length === 0 && (
                    <tr><td colSpan={7} className="p-8 text-center text-gray-500">No raters found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Severity Distribution */}
        {activeTab === "severity" && (
          <motion.div key="severity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-sm font-medium text-white mb-4">Rater Severity Distribution (logit scale)</h3>
              <SeverityBarChart data={data.severityDist} />
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <div className="bg-red-500/10 rounded p-2 text-center">
                  <div className="text-red-300 font-semibold">{data.raters.filter((r) => r.severityFlag === "SEVERE").length}</div>
                  <div className="text-gray-400">Severe (&gt;+0.5 logit)</div>
                </div>
                <div className="bg-green-500/10 rounded p-2 text-center">
                  <div className="text-green-300 font-semibold">{data.raters.filter((r) => r.severityFlag === "CENTRAL").length}</div>
                  <div className="text-gray-400">Central (±0.5 logit)</div>
                </div>
                <div className="bg-blue-500/10 rounded p-2 text-center">
                  <div className="text-blue-300 font-semibold">{data.raters.filter((r) => r.severityFlag === "LENIENT").length}</div>
                  <div className="text-gray-400">Lenient (&lt;−0.5 logit)</div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                Severity logit &gt; 0.5: rater grades more strictly than average. &lt; −0.5: more lenient.
                Severity adjustment is applied when logit |z| &gt; 1 logit (Linacre, 1994).
              </p>
            </div>
          </motion.div>
        )}

        {/* Fit Statistics */}
        {activeTab === "fit" && (
          <motion.div key="fit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="overflow-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-white/10">
                    <th className="text-left p-3">Rater</th>
                    <th className="text-right p-3">Infit MNSQ</th>
                    <th className="text-right p-3">Outfit MNSQ</th>
                    <th className="text-right p-3">Arbitration %</th>
                    <th className="text-right p-3">SD Score</th>
                    <th className="text-center p-3">Erratic?</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.raters].sort((a, b) => b.infitMNSQ - a.infitMNSQ).map((r) => (
                    <tr key={r.raterId} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-3 font-medium text-white">{r.raterLabel}</td>
                      <td className="p-3 text-right"><MNSQBadge mnsq={r.infitMNSQ} /></td>
                      <td className="p-3 text-right"><MNSQBadge mnsq={r.outfitMNSQ} /></td>
                      <td className="p-3 text-right text-gray-300">{(r.arbitrationRate * 100).toFixed(1)}%</td>
                      <td className="p-3 text-right font-mono text-gray-300">{r.sdScore.toFixed(2)}</td>
                      <td className="p-3 text-center">
                        {r.severityFlag === "ERRATIC" ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-orange-500/20 text-orange-300">ERRATIC</span>
                        ) : (
                          <span className="text-green-500">✓</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 p-3 bg-white/5 rounded-lg text-xs text-gray-400">
              Infit MNSQ acceptable range: 0.70–1.30 (Wright & Mok, 2000). Values outside this range indicate
              unexpected scoring patterns: &gt;1.30 = erratic/noisy, &lt;0.70 = overly predictable.
            </div>
          </motion.div>
        )}

        {/* MFRM Policy */}
        {activeTab === "policy" && (
          <motion.div key="policy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="space-y-4">
              {[
                {
                  title: "Severity Calibration (Linacre, 1994)",
                  body: `Rater severity is estimated as a logit parameter in the MFRM. Raters with severity logit > +1.0 or < -1.0 are flagged for score adjustment. Severity estimates are updated monthly using the last 100 double-rated responses per rater.`,
                  color: "#6366f1",
                  icon: <TrendingUp size={14} />,
                },
                {
                  title: "Inter-Rater Reliability Threshold",
                  body: `QWK (Quadratic Weighted Kappa) target ≥ 0.70 (weighted by score distance). Raters with QWK < 0.60 over 20+ double-rated essays trigger a calibration alert and re-norming session. QWK < 0.50 triggers suspension pending retraining.`,
                  color: "#22c55e",
                  icon: <Award size={14} />,
                },
                {
                  title: "Fit Monitoring (Wright & Mok, 2000)",
                  body: `Infit MNSQ 0.70–1.30: acceptable. >1.30: erratic scoring, unusual response patterns. <0.70: mechanistic over-consistency. Outfit MNSQ similarly interpreted. Both values are computed from the residuals of observed vs expected scores under the MFRM.`,
                  color: "#f59e0b",
                  icon: <BarChart3 size={14} />,
                },
                {
                  title: "Arbitration Protocol",
                  body: `When |score₁ − score₂| > 0.20 (normalised scale), a third arbitrator scores blindly. Arbitration rate target: < 5%. Persistent arbitration rates > 10% trigger rater recalibration. Resolution uses the arithmetic mean of all three scores.`,
                  color: "#ef4444",
                  icon: <AlertTriangle size={14} />,
                },
                {
                  title: "Automatic Score Adjustment",
                  body: `Rater scores are adjusted for severity before theta estimation: adjusted_score = raw_score − (severity_logit × 0.1). This prevents systematic bias from severe or lenient raters affecting candidate ability estimates (Myford & Wolfe, 2003).`,
                  color: "#06b6d4",
                  icon: <TrendingDown size={14} />,
                },
              ].map((s) => (
                <div key={s.title} className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center gap-2 mb-2" style={{ color: s.color }}>
                    {s.icon}
                    <h3 className="text-sm font-semibold text-white">{s.title}</h3>
                  </div>
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
