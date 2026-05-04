/**
 * Item Exposure Control Panel
 *
 * Admin view for CAT item exposure monitoring and Sympson-Hetter control.
 *
 * Features:
 *   - Global exposure rate table with over-exposure flag (> k_max)
 *   - Sympson-Hetter conditional rates per theta stratum (θ<-1.5, -1.5…-0.5, -0.5…0.5, 0.5…1.5, >1.5)
 *   - k_max threshold setting per skill
 *   - Exposure distribution histogram
 *
 * Endpoint: GET /api/psychometrics/item-exposure
 * Returns: { items: ExposureItem[], totalTests: number, stratumTotals: number[], kMax: number }
 */

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { RefreshCw, AlertTriangle, CheckCircle2, Settings2 } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ExposureItem {
  id: string;
  skill: string;
  cefrLevel: string;
  globalRate: number;        // exposures / totalTests
  exposureCount: number;
  conditionalRates: number[]; // per stratum [0..4]
  overExposed: boolean;
  maxConditionalRate: number;
}

interface ExposureData {
  items: ExposureItem[];
  totalTests: number;
  stratumTotals: number[];
  kMax: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STRATUM_LABELS = ["θ<−1.5","−1.5…−0.5","−0.5…0.5","0.5…1.5","θ>1.5"];
const STRATUM_CEFR  = ["A1","A2","B1","B2","C1+"];
const SKILL_COLOR: Record<string, string> = {
  READING: "#4f46e5", LISTENING: "#0891b2", WRITING: "#059669",
  SPEAKING: "#d97706", GRAMMAR: "#7c3aed", VOCABULARY: "#db2777",
};

function RateBar({ rate, kMax }: { rate: number; kMax: number }) {
  const pct = Math.min(100, rate * 100);
  const over = rate > kMax;
  return (
    <div className="flex items-center gap-1.5 w-full">
      <div className="flex-1 bg-slate-100 rounded h-2 overflow-hidden">
        <motion.div
          className="h-full rounded"
          style={{ backgroundColor: over ? "#ef4444" : "#4f46e5" }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <span className={`text-xs font-mono w-10 flex-shrink-0 ${over ? "text-red-600 font-semibold" : "text-slate-500"}`}>
        {(rate * 100).toFixed(1)}%
      </span>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function ItemExposurePanel() {
  const [data, setData] = useState<ExposureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterOverOnly, setFilterOverOnly] = useState(false);
  const [filterSkill, setFilterSkill] = useState("ALL");
  const [showStratum, setShowStratum] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/psychometrics/item-exposure", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setData(d); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const skills = data ? Array.from(new Set(data.items.map((i) => i.skill))).sort() : [];

  const items = (data?.items ?? []).filter((it) => {
    if (filterOverOnly && !it.overExposed) return false;
    if (filterSkill !== "ALL" && it.skill !== filterSkill) return false;
    return true;
  });

  const overCount = data?.items.filter((i) => i.overExposed).length ?? 0;
  const kMax = data?.kMax ?? 0.2;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Item Exposure Control</h2>
          <p className="text-sm text-slate-400">
            Sympson–Hetter conditional exposure monitoring across θ strata
            {data && ` · ${data.totalTests.toLocaleString()} test starts · k_max = ${(kMax * 100).toFixed(0)}%`}
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
            <div className="rounded-xl border border-slate-200 p-4 bg-white text-center">
              <p className="text-2xl font-bold text-indigo-700">{data.items.length}</p>
              <p className="text-xs text-slate-500 mt-1">Tracked Items</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 bg-white text-center">
              <p className={`text-2xl font-bold ${overCount > 0 ? "text-red-600" : "text-green-700"}`}>{overCount}</p>
              <p className="text-xs text-slate-500 mt-1">Over-exposed (&gt;{(kMax * 100).toFixed(0)}%)</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 bg-white text-center">
              <p className="text-2xl font-bold text-slate-700">{data.totalTests.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-1">Total Test Starts</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4 bg-white text-center">
              <p className="text-2xl font-bold text-slate-700">
                {data.items.length > 0
                  ? (data.items.reduce((s, i) => s + i.globalRate, 0) / data.items.length * 100).toFixed(1) + "%"
                  : "—"}
              </p>
              <p className="text-xs text-slate-500 mt-1">Mean Exposure Rate</p>
            </div>
          </div>

          {/* Stratum totals */}
          <div className="border border-slate-200 rounded-xl bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-700">θ Stratum Administration Counts</p>
              <button
                onClick={() => setShowStratum(!showStratum)}
                className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
              >
                <Settings2 size={12} />
                {showStratum ? "Hide" : "Show"} details
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {STRATUM_LABELS.map((label, i) => {
                const total = data.stratumTotals[i] ?? 0;
                const maxTotal = Math.max(...data.stratumTotals, 1);
                return (
                  <div key={i} className="text-center">
                    <div className="relative h-12 bg-slate-100 rounded overflow-hidden mb-1">
                      <motion.div
                        className="absolute bottom-0 left-0 right-0 bg-indigo-500 rounded"
                        initial={{ height: 0 }}
                        animate={{ height: `${(total / maxTotal) * 100}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                      />
                    </div>
                    <p className="text-xs font-semibold text-slate-700">{total}</p>
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="text-xs text-indigo-600">{STRATUM_CEFR[i]}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={filterOverOnly}
                onChange={(e) => setFilterOverOnly(e.target.checked)}
                className="rounded border-slate-300"
              />
              Show over-exposed only
            </label>
            <div className="flex gap-1 flex-wrap">
              {["ALL", ...skills].map((s) => (
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

          {/* Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-medium">Skill / CEFR</th>
                    <th className="text-right px-3 py-2.5 font-medium">Exposures</th>
                    <th className="text-left px-3 py-2.5 font-medium w-40">Global Rate</th>
                    {showStratum && STRATUM_LABELS.map((l, i) => (
                      <th key={i} className="text-center px-2 py-2.5 font-medium whitespace-nowrap">{STRATUM_CEFR[i]}</th>
                    ))}
                    <th className="text-center px-3 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it) => (
                    <tr key={it.id} className={`hover:bg-slate-50 ${it.overExposed ? "bg-red-50" : ""}`}>
                      <td className="px-3 py-2">
                        <span className="font-medium" style={{ color: SKILL_COLOR[it.skill] ?? "#64748b" }}>{it.skill}</span>
                        <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-medium text-slate-600 bg-slate-100">
                          {it.cefrLevel}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-slate-700">{it.exposureCount}</td>
                      <td className="px-3 py-2">
                        <RateBar rate={it.globalRate} kMax={kMax} />
                      </td>
                      {showStratum && it.conditionalRates.map((r, i) => (
                        <td key={i} className="px-2 py-2 text-center font-mono text-slate-500">
                          <span className={r > kMax ? "text-red-600 font-semibold" : ""}>
                            {(r * 100).toFixed(0)}%
                          </span>
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center">
                        {it.overExposed
                          ? <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto" />
                          : <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                        }
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={showStratum ? 5 + STRATUM_LABELS.length : 5} className="px-4 py-8 text-center text-slate-400">
                        {data.totalTests === 0
                          ? "No test starts recorded yet — exposure data will appear once assessments run."
                          : "No items match the current filter."
                        }
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
