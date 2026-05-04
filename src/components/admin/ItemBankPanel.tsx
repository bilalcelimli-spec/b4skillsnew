/**
 * Item Bank Exposure Panel
 *
 * Displays per-stratum item exposure rates derived from alpha-stratification,
 * Sympson-Hetter style exposure control stats, and per-skill bank health.
 *
 * Metrics shown:
 *  - Strata usage (% of items used, total items, per-stratum)
 *  - Over-exposed items (exposure rate > threshold)
 *  - Under-exposed items (never used)
 *  - Bank size per skill × CEFR level
 */

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { RefreshCw, TrendingUp, TrendingDown, Layers, BarChart3 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StratumStat {
  stratumIndex: number;
  label: string;       // e.g. "Stratum 1 (Low α)"
  totalItems: number;
  usedItems: number;
  usageRate: number;   // 0–1
  minA: number;
  maxA: number;
}

interface ExposureReport {
  totalActive: number;
  neverUsed: number;
  overExposed: number;           // usage rate > overExposureThreshold
  overExposureThreshold: number; // default 0.30 (Sympson-Hetter)
  strata: StratumStat[];
  bySkill: Record<string, { total: number; active: number; pretest: number; retired: number }>;
  byCefrLevel: Record<string, { total: number; active: number }>;
}

// ─── Mini bar ─────────────────────────────────────────────────────────────────

function Bar({ value, max = 1, color = "bg-indigo-500" }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(1, value / Math.max(max, 1)) * 100;
  return (
    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ItemBankPanel() {
  const [report, setReport]   = useState<ExposureReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab]         = useState<"strata" | "skill" | "cefr">("strata");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/items/exposure-report", { credentials: "include" });
      if (res.ok) setReport(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const TABS = [
    { id: "strata" as const, label: "α-Strata", icon: <Layers className="w-3.5 h-3.5" /> },
    { id: "skill"  as const, label: "By Skill",  icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: "cefr"   as const, label: "By CEFR",   icon: <BarChart3 className="w-3.5 h-3.5" /> },
  ];

  const overExposureColor = (rate: number, threshold: number) => {
    if (rate >= threshold) return "bg-red-500";
    if (rate >= threshold * 0.7) return "bg-amber-400";
    return "bg-indigo-500";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Item Bank Exposure</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            α-Stratified rotation (Chang &amp; Ying 1999) · Sympson-Hetter exposure control
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

      {loading && !report ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
        </div>
      ) : !report ? (
        <div className="text-center py-12 text-slate-400 text-sm">Failed to load exposure report.</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {
                label: "Active Items",
                value: report.totalActive,
                icon: <BarChart3 className="w-4 h-4" />,
                color: "bg-indigo-50 text-indigo-700",
              },
              {
                label: "Never Used",
                value: report.neverUsed,
                icon: <TrendingDown className="w-4 h-4" />,
                color: "bg-slate-50 text-slate-600",
              },
              {
                label: `Over-Exposed (>${Math.round(report.overExposureThreshold * 100)}%)`,
                value: report.overExposed,
                icon: <TrendingUp className="w-4 h-4" />,
                color: report.overExposed > 0 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700",
              },
              {
                label: "α-Strata",
                value: report.strata.length,
                icon: <Layers className="w-4 h-4" />,
                color: "bg-purple-50 text-purple-700",
              },
            ].map((c) => (
              <div key={c.label} className={`rounded-xl p-4 ${c.color} flex items-start gap-3`}>
                <div className="mt-0.5 opacity-60">{c.icon}</div>
                <div>
                  <div className="text-2xl font-bold">{c.value}</div>
                  <div className="text-xs font-medium mt-0.5 opacity-80 leading-tight">{c.label}</div>
                </div>
              </div>
            ))}
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

          {/* α-Strata tab */}
          {tab === "strata" && (
            <div className="space-y-3">
              {report.strata.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No strata data available. Strata are built at engine initialisation.
                </div>
              ) : (
                report.strata.map((s) => (
                  <div key={s.stratumIndex} className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-sm text-slate-800">{s.label}</span>
                        <span className="ml-2 text-xs text-slate-400">
                          a ∈ [{s.minA.toFixed(2)}, {s.maxA.toFixed(2)}]
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-slate-800">
                          {Math.round(s.usageRate * 100)}%
                        </span>
                        <span className="text-xs text-slate-400 ml-1">
                          ({s.usedItems}/{s.totalItems})
                        </span>
                      </div>
                    </div>
                    <Bar
                      value={s.usageRate}
                      color={overExposureColor(s.usageRate, report.overExposureThreshold)}
                    />
                  </div>
                ))
              )}
            </div>
          )}

          {/* By Skill tab */}
          {tab === "skill" && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs">
                  <tr>
                    <th className="text-left p-3 font-medium">Skill</th>
                    <th className="text-right p-3 font-medium">Total</th>
                    <th className="text-right p-3 font-medium">Active</th>
                    <th className="text-right p-3 font-medium">Pretest</th>
                    <th className="text-right p-3 font-medium">Retired</th>
                    <th className="p-3 font-medium w-32">Active Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(report.bySkill).map(([skill, counts]) => (
                    <tr key={skill} className="hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-800">{skill}</td>
                      <td className="p-3 text-right text-slate-600">{counts.total}</td>
                      <td className="p-3 text-right text-indigo-700 font-medium">{counts.active}</td>
                      <td className="p-3 text-right text-amber-600">{counts.pretest}</td>
                      <td className="p-3 text-right text-slate-400">{counts.retired}</td>
                      <td className="p-3 w-32">
                        <Bar value={counts.active} max={counts.total} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* By CEFR tab */}
          {tab === "cefr" && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs">
                  <tr>
                    <th className="text-left p-3 font-medium">CEFR Level</th>
                    <th className="text-right p-3 font-medium">Total</th>
                    <th className="text-right p-3 font-medium">Active</th>
                    <th className="p-3 font-medium w-32">Active Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"].map((level) => {
                    const counts = report.byCefrLevel[level];
                    if (!counts) return null;
                    return (
                      <tr key={level} className="hover:bg-slate-50">
                        <td className="p-3 font-medium text-slate-800">{level}</td>
                        <td className="p-3 text-right text-slate-600">{counts.total}</td>
                        <td className="p-3 text-right text-indigo-700 font-medium">{counts.active}</td>
                        <td className="p-3 w-32">
                          <Bar value={counts.active} max={counts.total} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
