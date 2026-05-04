import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, Map, AlertTriangle, CheckCircle2, BookOpen } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CellData {
  skill: string;
  cefrLevel: string;
  count: number;
  target: number;
  compliancePct: number;
  status: "ok" | "low" | "critical" | "over";
}

interface BlueprintPayload {
  cells: CellData[];
  skills: string[];
  levels: string[];
  totalActive: number;
  totalTarget: number;
  overallCompliance: number;
  criticalGaps: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cellColor(status: CellData["status"], count: number): string {
  if (count === 0) return "bg-slate-900 text-slate-600";
  if (status === "critical") return "bg-red-900/70 text-red-200";
  if (status === "low") return "bg-amber-900/60 text-amber-200";
  if (status === "over") return "bg-purple-900/60 text-purple-200";
  return "bg-emerald-900/50 text-emerald-200";
}

function statusBadge(status: CellData["status"]) {
  const map: Record<CellData["status"], string> = {
    ok: "bg-emerald-900/60 text-emerald-300",
    low: "bg-amber-900/60 text-amber-300",
    critical: "bg-red-900/60 text-red-300",
    over: "bg-purple-900/60 text-purple-300",
  };
  const labels: Record<CellData["status"], string> = { ok: "OK", low: "Low", critical: "Critical", over: "Over" };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${map[status]}`}>
      {labels[status]}
    </span>
  );
}

const SKILL_LABELS: Record<string, string> = {
  GRAMMAR: "Grammar", VOCABULARY: "Vocabulary", READING: "Reading",
  LISTENING: "Listening", WRITING: "Writing", SPEAKING: "Speaking",
};

const CEFR_ORDER = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
const CEFR_COLORS: Record<string, string> = {
  PRE_A1: "text-slate-400", A1: "text-blue-400", A2: "text-cyan-400",
  B1: "text-emerald-400", B2: "text-yellow-400", C1: "text-orange-400", C2: "text-red-400",
};

// ─── Component ────────────────────────────────────────────────────────────────

export const ContentBlueprintPanel: React.FC = () => {
  const [data, setData] = useState<BlueprintPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"heatmap" | "gaps">("heatmap");
  const [skillFilter, setSkillFilter] = useState<string>("ALL");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/psychometrics/blueprint-compliance")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const filteredCells = data
    ? data.cells.filter((c) => skillFilter === "ALL" || c.skill === skillFilter)
    : [];

  const gapCells = filteredCells
    .filter((c) => c.status === "critical" || c.status === "low")
    .sort((a, b) => a.compliancePct - b.compliancePct);

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Map size={20} className="text-teal-400" />
            Content Blueprint Compliance
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Item bank coverage vs. target blueprint by Skill × CEFR level
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>
      )}

      {/* KPI cards */}
      {data && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Active Items", value: data.totalActive.toLocaleString(), color: "text-teal-400" },
            { label: "Blueprint Target", value: data.totalTarget.toLocaleString(), color: "text-blue-400" },
            {
              label: "Overall Compliance",
              value: `${Math.round(data.overallCompliance)}%`,
              color: data.overallCompliance >= 80 ? "text-emerald-400" : data.overallCompliance >= 60 ? "text-amber-400" : "text-red-400",
            },
            {
              label: "Critical Gaps",
              value: data.criticalGaps.toString(),
              color: data.criticalGaps === 0 ? "text-emerald-400" : "text-red-400",
            },
          ].map((k) => (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800 border border-slate-700 rounded-xl p-4"
            >
              <p className="text-slate-400 text-xs mb-1">{k.label}</p>
              <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {(["heatmap", "gaps"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-teal-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
          >
            {t === "heatmap" ? "Coverage Heatmap" : "Gap Analysis"}
          </button>
        ))}
        <div className="ml-auto">
          <select
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="bg-slate-700 border border-slate-600 text-slate-200 text-sm rounded-lg px-2 py-1"
          >
            <option value="ALL">All Skills</option>
            {(data?.skills ?? []).map((s) => (
              <option key={s} value={s}>{SKILL_LABELS[s] ?? s}</option>
            ))}
          </select>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="load" className="flex justify-center py-16 text-slate-500 text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Loading blueprint data…
          </motion.div>
        ) : data && tab === "heatmap" ? (
          <motion.div key="heatmap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-x-auto">
            {/* Grid */}
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-slate-400 text-xs px-2 py-1 font-medium">Skill</th>
                  {CEFR_ORDER.filter((l) => data.levels.includes(l)).map((l) => (
                    <th key={l} className={`text-center text-xs px-2 py-1 font-semibold ${CEFR_COLORS[l]}`}>{l.replace("_", "")}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data.skills.filter((s) => skillFilter === "ALL" || s === skillFilter)).map((skill) => (
                  <tr key={skill} className="border-t border-slate-800">
                    <td className="text-slate-300 text-xs px-2 py-1.5 font-medium whitespace-nowrap">
                      {SKILL_LABELS[skill] ?? skill}
                    </td>
                    {CEFR_ORDER.filter((l) => data.levels.includes(l)).map((lvl) => {
                      const cell = data.cells.find((c) => c.skill === skill && c.cefrLevel === lvl);
                      if (!cell) return (
                        <td key={lvl} className="text-center px-2 py-1.5">
                          <div className="mx-auto w-14 h-12 rounded bg-slate-900 text-slate-700 flex flex-col items-center justify-center text-[10px]">—</div>
                        </td>
                      );
                      return (
                        <td key={lvl} className="text-center px-1 py-1">
                          <div
                            className={`mx-auto w-16 h-14 rounded flex flex-col items-center justify-center cursor-default transition-all ${cellColor(cell.status, cell.count)}`}
                            title={`${skill} ${lvl}: ${cell.count}/${cell.target} (${Math.round(cell.compliancePct)}%)`}
                          >
                            <span className="font-bold text-sm leading-tight">{cell.count}</span>
                            <span className="text-[9px] opacity-70">/ {cell.target}</span>
                            <span className="text-[9px] font-semibold">{Math.round(cell.compliancePct)}%</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Legend */}
            <div className="mt-4 flex gap-4 text-[11px] text-slate-400">
              {[
                { bg: "bg-emerald-900/50", label: "≥ 100% — OK" },
                { bg: "bg-amber-900/60", label: "50-99% — Low" },
                { bg: "bg-red-900/70", label: "< 50% — Critical" },
                { bg: "bg-purple-900/60", label: "> 150% — Over-banked" },
                { bg: "bg-slate-900", label: "0 — Empty" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded ${l.bg}`} />
                  <span>{l.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ) : data && tab === "gaps" ? (
          <motion.div key="gaps" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {gapCells.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500" />
                No coverage gaps detected.
              </div>
            ) : (
              <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900">
                    <tr>
                      {["Skill", "CEFR Level", "Items", "Target", "Coverage", "Status", "Shortfall"].map((h) => (
                        <th key={h} className="text-left text-slate-400 text-xs px-3 py-2 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gapCells.map((c) => (
                      <tr key={`${c.skill}-${c.cefrLevel}`} className="border-t border-slate-700 hover:bg-slate-700/30 transition-colors">
                        <td className="px-3 py-2 text-slate-200 font-medium">{SKILL_LABELS[c.skill] ?? c.skill}</td>
                        <td className={`px-3 py-2 font-semibold ${CEFR_COLORS[c.cefrLevel] ?? "text-slate-300"}`}>
                          {c.cefrLevel.replace("_", "")}
                        </td>
                        <td className="px-3 py-2 text-slate-300">{c.count}</td>
                        <td className="px-3 py-2 text-slate-300">{c.target}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${c.compliancePct < 50 ? "bg-red-500" : "bg-amber-500"}`}
                                style={{ width: `${Math.min(100, c.compliancePct)}%` }}
                              />
                            </div>
                            <span className="text-slate-300 text-xs">{Math.round(c.compliancePct)}%</span>
                          </div>
                        </td>
                        <td className="px-3 py-2">{statusBadge(c.status)}</td>
                        <td className="px-3 py-2 text-red-400 font-semibold">
                          {c.target - c.count > 0 ? `−${c.target - c.count}` : "0"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Summary insight */}
            {gapCells.length > 0 && (
              <div className="mt-4 bg-amber-900/20 border border-amber-700/50 rounded-lg p-3 text-amber-300 text-sm flex items-start gap-2">
                <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
                <span>
                  {gapCells.filter((c) => c.status === "critical").length} critical gap(s) and{" "}
                  {gapCells.filter((c) => c.status === "low").length} low-coverage cell(s) detected.
                  Total shortfall: {gapCells.reduce((s, c) => s + Math.max(0, c.target - c.count), 0)} items needed to meet blueprint.
                </span>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
