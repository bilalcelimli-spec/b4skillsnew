/**
 * Item Bank Inventory Report
 *
 * Faz I deliverable: shows the full skill × CEFR coverage matrix so that
 * Phase I planning (standard-setting, anchor-set seeding) can be grounded in
 * actual data rather than guesses.
 *
 * Columns: CEFR levels (PRE_A1 → C2)
 * Rows:    Skills (READING, LISTENING, WRITING, SPEAKING, GRAMMAR, VOCABULARY)
 * Cells:   N active / N pretest / N total  (color-coded by target coverage)
 */

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { RefreshCw, AlertTriangle, CheckCircle2, Info, Database } from "lucide-react";
import { motion } from "motion/react";

const SKILLS = ["READING", "LISTENING", "WRITING", "SPEAKING", "GRAMMAR", "VOCABULARY"] as const;
const CEFR_LEVELS = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"] as const;
const CEFR_LABELS: Record<string, string> = {
  PRE_A1: "Pre-A1", A1: "A1", A2: "A2", B1: "B1", B2: "B2", C1: "C1", C2: "C2",
};

/** Minimum live items per cell for a production-grade bank (small-volume B2B target). */
const TARGET_ACTIVE = 30;
/** Minimum for a "cautionary" yellow flag. */
const WARN_ACTIVE = 15;

type Cell = {
  counts: Record<string, number>;
  total: number;
  avgDiscrimination: number | null;
  avgDifficulty: number | null;
  avgGuessing: number | null;
};

type InventoryData = {
  matrix: Record<string, Record<string, Cell>>;
  skillTotals: Record<string, { total: number; active: number; pretest: number }>;
  grandTotal: number;
};

function coverageColor(active: number): string {
  if (active >= TARGET_ACTIVE) return "bg-emerald-50 border-emerald-200 text-emerald-900";
  if (active >= WARN_ACTIVE) return "bg-amber-50 border-amber-200 text-amber-900";
  if (active > 0) return "bg-red-50 border-red-200 text-red-900";
  return "bg-slate-50 border-slate-200 text-slate-400";
}

function coverageIcon(active: number) {
  if (active >= TARGET_ACTIVE) return <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />;
  if (active >= WARN_ACTIVE) return <AlertTriangle size={10} className="text-amber-500 shrink-0" />;
  return <AlertTriangle size={10} className="text-red-400 shrink-0" />;
}

export const ItemBankInventory: React.FC = () => {
  const [data, setData] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/items/inventory", { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <Database size={18} className="text-indigo-600" />
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-tight text-slate-900">
                Item Bank Inventory
              </CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Coverage matrix: skill × CEFR — active item count per cell
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="h-8 text-[10px] font-black uppercase tracking-widest rounded-xl"
          >
            <RefreshCw size={12} className={`mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>

        <CardContent className="p-6">
          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-6 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-200 inline-block" />
              <span className="text-slate-600">≥{TARGET_ACTIVE} active (target)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-100 border border-amber-200 inline-block" />
              <span className="text-slate-600">≥{WARN_ACTIVE} active (warning)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-100 border border-red-200 inline-block" />
              <span className="text-slate-600">&lt;{WARN_ACTIVE} active (critical)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-slate-100 border border-slate-200 inline-block" />
              <span className="text-slate-600">0 items</span>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">
              <AlertTriangle size={14} />
              {error}
            </div>
          )}

          {loading && !data && (
            <div className="flex justify-center py-12 text-slate-400 text-sm">Loading inventory…</div>
          )}

          {data && (
            <>
              {/* Matrix Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left px-3 py-2 text-slate-400 font-black uppercase tracking-widest text-[9px] w-28">
                        Skill
                      </th>
                      {CEFR_LEVELS.map((cefr) => (
                        <th
                          key={cefr}
                          className="px-2 py-2 text-center text-slate-500 font-black uppercase tracking-widest text-[9px]"
                        >
                          {CEFR_LABELS[cefr]}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-right text-slate-400 font-black uppercase tracking-widest text-[9px]">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {SKILLS.map((skill) => {
                      const skillRow = data.matrix[skill] ?? {};
                      const st = data.skillTotals[skill] ?? { total: 0, active: 0, pretest: 0 };
                      return (
                        <tr key={skill} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-bold text-slate-700 text-[10px] uppercase tracking-wider">
                            {skill.charAt(0) + skill.slice(1).toLowerCase()}
                          </td>
                          {CEFR_LEVELS.map((cefr) => {
                            const cell = skillRow[cefr];
                            const active = cell?.counts?.ACTIVE ?? 0;
                            const pretest = cell?.counts?.PRETEST ?? 0;
                            const total = cell?.total ?? 0;
                            return (
                              <td key={cefr} className="px-1 py-1">
                                <div
                                  className={`flex flex-col items-center justify-center border rounded-lg px-2 py-1.5 min-w-[56px] ${coverageColor(active)}`}
                                  title={`Active: ${active} | Pretest: ${pretest} | Total: ${total}${cell?.avgDifficulty !== null ? ` | Avg b: ${cell?.avgDifficulty?.toFixed(2)}` : ""}`}
                                >
                                  <div className="flex items-center gap-0.5">
                                    {coverageIcon(active)}
                                    <span className="font-black text-[11px]">{active}</span>
                                  </div>
                                  {pretest > 0 && (
                                    <span className="text-[9px] opacity-60">+{pretest} pre</span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          <td className="px-3 py-2 text-right">
                            <div className="text-[11px] font-black text-slate-700">{st.total}</div>
                            <div className="text-[9px] text-slate-400">{st.active} live</div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50/50">
                      <td className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Grand Total
                      </td>
                      {CEFR_LEVELS.map((cefr) => {
                        const cefrTotal = SKILLS.reduce(
                          (s, skill) => s + (data.matrix[skill]?.[cefr]?.total ?? 0),
                          0
                        );
                        const cefrActive = SKILLS.reduce(
                          (s, skill) => s + (data.matrix[skill]?.[cefr]?.counts?.ACTIVE ?? 0),
                          0
                        );
                        return (
                          <td key={cefr} className="px-1 py-2 text-center">
                            <div className="text-[10px] font-black text-slate-700">{cefrActive}</div>
                            <div className="text-[9px] text-slate-400">{cefrTotal} tot</div>
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-right">
                        <div className="text-sm font-black text-indigo-700">{data.grandTotal}</div>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Info note */}
              <div className="mt-4 flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-3">
                <Info size={13} className="mt-0.5 shrink-0 text-indigo-400" />
                <span>
                  Cell shows <strong>active item count</strong>. Hover for pretest count and average IRT difficulty (b).
                  Target: ≥{TARGET_ACTIVE} active items per cell for production use (high-stakes target: 100+).
                  Cells highlighted red are Phase I priority for content seeding.
                </span>
              </div>

              {/* Skill summary row */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {SKILLS.map((skill) => {
                  const st = data.skillTotals[skill] ?? { total: 0, active: 0, pretest: 0 };
                  const pct = st.total > 0 ? Math.round((st.active / st.total) * 100) : 0;
                  return (
                    <div
                      key={skill}
                      className="rounded-xl border border-slate-200 bg-white p-3 flex flex-col gap-1"
                    >
                      <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        {skill}
                      </div>
                      <div className="text-lg font-black text-slate-800">{st.active}</div>
                      <div className="text-[10px] text-slate-500">live items</div>
                      <div className="w-full bg-slate-100 rounded-full h-1 mt-1">
                        <div
                          className="bg-indigo-500 h-1 rounded-full"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <div className="text-[9px] text-slate-400">{pct}% active</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
