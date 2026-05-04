import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, Key, CheckCircle2, AlertTriangle, Upload } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CellStatus {
  skill: string;
  cefrLevel: string;
  count: number;
  target: number;
  expertVerified: number;
  status: "OK" | "LOW" | "MISSING";
}

interface AnchorItemDetail {
  itemId: string;
  skill: string;
  cefrLevel: string;
  a: number;
  b: number;
  c: number;
  calibrationN: number;
  expertVerified: boolean;
  addedAt: string;
  bDeviation: number;      // |b - CEFR expected|
  stabilityFlag: boolean;  // b deviation > 1.0
}

interface AnchorPayload {
  totalItems: number;
  expertVerifiedCount: number;
  expertVerifiedPct: number;
  cellsOK: number;
  cellsLow: number;
  cellsMissing: number;
  totalCells: number;
  lastUpdated: string;
  cells: CellStatus[];
  items: AnchorItemDetail[];
  bySkill: { skill: string; count: number; target: number }[];
  byCefr: { cefrLevel: string; count: number }[];
  gaps: { skill: string; cefrLevel: string; count: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SKILL_COLORS: Record<string, string> = {
  GRAMMAR: "#3b82f6", VOCABULARY: "#10b981", READING: "#f59e0b",
  LISTENING: "#8b5cf6", WRITING: "#ef4444", SPEAKING: "#f97316",
};
const CEFR_BG: Record<string, string> = {
  PRE_A1: "#475569", A1: "#3b82f6", A2: "#06b6d4",
  B1: "#10b981", B2: "#f59e0b", C1: "#f97316", C2: "#ef4444",
};
const SKILLS = ["GRAMMAR", "VOCABULARY", "READING", "LISTENING", "WRITING", "SPEAKING"];
const CEFR_LEVELS = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
const TARGET = 10;

function statusColor(s: CellStatus): string {
  if (s.status === "OK") return "bg-emerald-500";
  if (s.status === "LOW") return "bg-amber-500";
  return "bg-slate-700";
}
function statusText(s: CellStatus): string {
  if (s.status === "OK") return "text-emerald-400";
  if (s.status === "LOW") return "text-amber-400";
  return "text-slate-500";
}

// ─── Coverage Matrix ──────────────────────────────────────────────────────────

const CoverageMatrix: React.FC<{ cells: CellStatus[] }> = ({ cells }) => {
  const cellMap: Record<string, CellStatus> = {};
  for (const c of cells) cellMap[`${c.skill}::${c.cefrLevel}`] = c;

  return (
    <div className="overflow-auto">
      <table className="text-xs border-collapse">
        <thead>
          <tr>
            <th className="px-2 py-1 text-slate-400 text-left">Skill \\ CEFR</th>
            {CEFR_LEVELS.map((l) => (
              <th key={l} className="px-2 py-1 text-center">
                <span className="px-1 py-0.5 rounded text-[10px] text-white font-semibold"
                  style={{ backgroundColor: CEFR_BG[l] ?? "#475569" }}>
                  {l.replace("_", "")}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SKILLS.map((skill) => (
            <tr key={skill}>
              <td className="px-2 py-1.5 font-medium" style={{ color: SKILL_COLORS[skill] ?? "#94a3b8" }}>{skill}</td>
              {CEFR_LEVELS.map((cefr) => {
                const cell = cellMap[`${skill}::${cefr}`];
                const count = cell?.count ?? 0;
                const fillPct = Math.min(100, (count / TARGET) * 100);
                return (
                  <td key={cefr} className="px-1 py-1">
                    <div className="w-12 h-8 bg-slate-800 rounded flex flex-col items-center justify-center relative overflow-hidden border border-slate-700">
                      <div
                        className={`absolute bottom-0 left-0 w-full ${cell?.status === "OK" ? "bg-emerald-900/60" : cell?.status === "LOW" ? "bg-amber-900/60" : "bg-slate-900/60"}`}
                        style={{ height: `${fillPct}%` }}
                      />
                      <span className={`relative z-10 text-[10px] font-bold ${statusText(cell ?? { status: "MISSING" } as CellStatus)}`}>
                        {count}
                      </span>
                      <span className="relative z-10 text-[8px] text-slate-500">/{TARGET}</span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const AnchorItemMonitorPanel: React.FC = () => {
  const [data, setData] = useState<AnchorPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"matrix" | "items" | "gaps" | "skill">("matrix");
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/psychometrics/anchor-monitor")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const displayItems = data
    ? data.items
        .filter((i) => !flaggedOnly || i.stabilityFlag || !i.expertVerified)
        .sort((a, b) => b.bDeviation - a.bDeviation)
        .slice(0, 100)
    : [];

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Key size={20} className="text-amber-400" />
            Anchor Item Monitor
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Anchor set coverage, IRT parameter stability, and expert verification status
          </p>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && <div className="bg-red-900/40 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>}

      {/* KPI cards */}
      {data && (
        <div className="grid grid-cols-6 gap-3">
          {[
            { label: "Anchor Items", value: data.totalItems.toLocaleString(), color: "text-amber-400" },
            { label: "Expert Verified", value: `${data.expertVerifiedPct.toFixed(0)}%`, color: data.expertVerifiedPct >= 80 ? "text-emerald-400" : "text-amber-400" },
            { label: "Cells OK", value: data.cellsOK.toString(), color: "text-emerald-400" },
            { label: "Cells Low", value: data.cellsLow.toString(), color: data.cellsLow > 0 ? "text-amber-400" : "text-slate-400" },
            { label: "Cells Missing", value: data.cellsMissing.toString(), color: data.cellsMissing > 0 ? "text-red-400" : "text-slate-400" },
            { label: "Coverage", value: `${((data.cellsOK / Math.max(1, data.totalCells)) * 100).toFixed(0)}%`, color: "text-blue-400" },
          ].map((k) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800 border border-slate-700 rounded-xl p-3">
              <p className="text-slate-400 text-xs mb-1">{k.label}</p>
              <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["matrix", "items", "gaps", "skill"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-amber-700 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
            {t === "matrix" ? "Coverage Matrix" : t === "items" ? "Item Catalogue" : t === "gaps" ? "Coverage Gaps" : "By Skill"}
          </button>
        ))}
        {tab === "items" && (
          <label className="ml-auto flex items-center gap-1.5 text-slate-300 text-xs cursor-pointer">
            <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} className="accent-amber-500" />
            Flagged / unverified only
          </label>
        )}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="load" className="flex justify-center py-16 text-slate-500 text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Loading anchor set…
          </motion.div>
        ) : data && tab === "matrix" ? (
          <motion.div key="matrix" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <div className="flex items-center gap-4 mb-4">
              <h3 className="text-sm font-semibold text-slate-300">Skill × CEFR Coverage (target: {TARGET} per cell)</h3>
              <div className="flex gap-3 ml-auto text-[10px] text-slate-400">
                {[{ color: "bg-emerald-900/60", label: `≥${TARGET} OK` }, { color: "bg-amber-900/60", label: "5–9 Low" }, { color: "bg-slate-900/60", label: "<5 Missing" }].map((l) => (
                  <div key={l.label} className="flex items-center gap-1">
                    <div className={`w-3 h-3 rounded ${l.color} border border-slate-600`} />
                    <span>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <CoverageMatrix cells={data.cells} />
          </motion.div>
        ) : data && tab === "items" ? (
          <motion.div key="items" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-900">
                  <tr>
                    {["Item", "Skill", "CEFR", "a", "b", "c", "n", "Verified", "|Δb|", "Status"].map((h) => (
                      <th key={h} className="text-left text-slate-400 text-xs px-2 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayItems.length === 0 && (
                    <tr><td colSpan={10} className="text-center py-8 text-slate-500 text-sm">No items match filter.</td></tr>
                  )}
                  {displayItems.map((item) => (
                    <tr key={item.itemId} className="border-t border-slate-700 hover:bg-slate-700/30">
                      <td className="px-2 py-1.5 text-slate-400 font-mono text-[10px]">{item.itemId.slice(-10)}</td>
                      <td className="px-2 py-1.5 font-medium text-xs" style={{ color: SKILL_COLORS[item.skill] ?? "#94a3b8" }}>{item.skill}</td>
                      <td className="px-2 py-1.5">
                        <span className="px-1 py-0.5 rounded text-[10px] text-white font-semibold"
                          style={{ backgroundColor: CEFR_BG[item.cefrLevel] ?? "#475569" }}>
                          {item.cefrLevel.replace("_", "")}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-slate-300 text-xs">{item.a.toFixed(2)}</td>
                      <td className="px-2 py-1.5 text-slate-300 text-xs">{item.b.toFixed(2)}</td>
                      <td className="px-2 py-1.5 text-slate-400 text-xs">{item.c.toFixed(2)}</td>
                      <td className="px-2 py-1.5 text-slate-500 text-xs">{item.calibrationN}</td>
                      <td className="px-2 py-1.5">
                        {item.expertVerified
                          ? <CheckCircle2 size={13} className="text-emerald-400" />
                          : <AlertTriangle size={13} className="text-amber-400" />
                        }
                      </td>
                      <td className={`px-2 py-1.5 text-xs font-mono ${item.bDeviation > 1.0 ? "text-red-400" : item.bDeviation > 0.5 ? "text-amber-400" : "text-slate-400"}`}>
                        {item.bDeviation.toFixed(3)}
                      </td>
                      <td className="px-2 py-1.5">
                        {item.stabilityFlag
                          ? <span className="text-[10px] text-red-400 font-semibold">REVIEW</span>
                          : <span className="text-[10px] text-emerald-400">OK</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : data && tab === "gaps" ? (
          <motion.div key="gaps" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Coverage Gaps (cells below target)</h3>
            {data.gaps.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 size={32} className="mx-auto mb-3 text-emerald-500" />
                <p className="text-emerald-400 font-semibold">All cells meet the target of {TARGET} anchor items.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.gaps
                  .sort((a, b) => a.count - b.count)
                  .map((g) => (
                    <div key={`${g.skill}::${g.cefrLevel}`} className="flex items-center gap-3 bg-slate-900 rounded-lg px-3 py-2">
                      <span className="text-xs font-medium w-28" style={{ color: SKILL_COLORS[g.skill] ?? "#94a3b8" }}>{g.skill}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] text-white font-semibold"
                        style={{ backgroundColor: CEFR_BG[g.cefrLevel] ?? "#475569" }}>
                        {g.cefrLevel.replace("_", "")}
                      </span>
                      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${g.count === 0 ? "bg-red-500" : "bg-amber-500"}`}
                          style={{ width: `${(g.count / TARGET) * 100}%` }} />
                      </div>
                      <span className={`text-xs font-semibold ${g.count === 0 ? "text-red-400" : "text-amber-400"}`}>
                        {g.count}/{TARGET}
                      </span>
                      <span className="text-slate-500 text-xs">need {TARGET - g.count} more</span>
                    </div>
                  ))}
              </div>
            )}
          </motion.div>
        ) : data && tab === "skill" ? (
          <motion.div key="skill" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Anchor Item Count by Skill</h3>
            <div className="space-y-3">
              {data.bySkill.map((s) => (
                <div key={s.skill} className="flex items-center gap-3">
                  <span className="text-xs w-24 font-medium" style={{ color: SKILL_COLORS[s.skill] ?? "#94a3b8" }}>{s.skill}</span>
                  <div className="flex-1 h-5 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${Math.min(100, (s.count / (s.target || 70)) * 100)}%`,
                      backgroundColor: s.count >= s.target ? "#10b981" : s.count >= s.target / 2 ? "#f59e0b" : "#ef4444",
                    }} />
                  </div>
                  <span className="text-slate-300 text-xs w-24 text-right">{s.count} / {s.target}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
