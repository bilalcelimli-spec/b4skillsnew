import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, ShieldAlert, CheckCircle2, AlertTriangle, Layers } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type GroupVar = "gender" | "nativeLanguage" | "ageGroup";

interface PolyDIFItem {
  itemId: string;
  itemLabel: string;
  skill: string;
  cefrLevel: string;
  groupVar: GroupVar;
  groupRef: string;
  groupFoc: string;
  nRef: number;
  nFoc: number;
  // Liu-Agresti ordinal MH log-odds
  logOddsRatio: number;
  seLogOdds: number;
  zScore: number;
  pValue: number;
  flagged: boolean;
  severity: "A" | "B" | "C";
}

interface PolyDIFPayload {
  totalItems: number;
  flaggedItems: number;
  categoryA: number;
  categoryB: number;
  categoryC: number;
  groupVar: GroupVar;
  groupVarsAvailable: GroupVar[];
  items: PolyDIFItem[];
  bySkill: { skill: string; flagged: number; total: number }[];
  byCefr: { cefrLevel: string; flagged: number; total: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SKILL_COLORS: Record<string, string> = {
  GRAMMAR: "#6366f1",
  VOCABULARY: "#8b5cf6",
  READING: "#3b82f6",
  LISTENING: "#06b6d4",
  WRITING: "#10b981",
  SPEAKING: "#f59e0b",
};
const CEFR_ORDER = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
const SEV_LABEL: Record<"A" | "B" | "C", string> = { A: "Large (A)", B: "Moderate (B)", C: "Negligible (C)" };
const SEV_COLOR: Record<"A" | "B" | "C", string> = { A: "#ef4444", B: "#f59e0b", C: "#10b981" };

function SeverityBadge({ sev }: { sev: "A" | "B" | "C" }) {
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-xs font-semibold"
      style={{ background: SEV_COLOR[sev] + "22", color: SEV_COLOR[sev] }}
    >
      {SEV_LABEL[sev]}
    </span>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-28 truncate text-slate-400">{label}</span>
      <div className="flex-1 bg-slate-800 rounded-full h-2">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-6 text-right text-slate-300">{value}</span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PolytomousDIFPanel() {
  const [data, setData] = useState<PolyDIFPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"items" | "bySkill" | "byCefr">("items");
  const [groupVar, setGroupVar] = useState<GroupVar>("gender");
  const [sortKey, setSortKey] = useState<"logOddsRatio" | "zScore" | "pValue">("logOddsRatio");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/psychometrics/polytomous-dif?groupVar=${groupVar}`);
      if (!r.ok) throw new Error(await r.text());
      setData(await r.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [groupVar]);

  useEffect(() => { load(); }, [load]);

  const kpiCards = data
    ? [
        { label: "Items Tested", value: data.totalItems, icon: <Layers size={16} />, color: "#6366f1" },
        { label: "Flagged", value: data.flaggedItems, icon: <ShieldAlert size={16} />, color: "#ef4444" },
        { label: "Category A", value: data.categoryA, icon: <AlertTriangle size={16} />, color: "#ef4444" },
        { label: "Category B", value: data.categoryB, icon: <AlertTriangle size={16} />, color: "#f59e0b" },
        { label: "Category C", value: data.categoryC, icon: <CheckCircle2 size={16} />, color: "#10b981" },
      ]
    : [];

  const displayItems = (data?.items ?? [])
    .filter((it) => !flaggedOnly || it.flagged)
    .filter((it) => !search || it.itemLabel.toLowerCase().includes(search.toLowerCase()) || it.skill.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortKey === "pValue") return a.pValue - b.pValue;
      return Math.abs(b[sortKey]) - Math.abs(a[sortKey]);
    });

  const maxSkill = Math.max(1, ...(data?.bySkill.map((s) => s.total) ?? [1]));
  const maxCefr = Math.max(1, ...(data?.byCefr.map((c) => c.total) ?? [1]));

  const tabs = [
    { id: "items" as const, label: "Item Table" },
    { id: "bySkill" as const, label: "By Skill" },
    { id: "byCefr" as const, label: "By CEFR" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Polytomous DIF — Ordinal Liu-Agresti MH</h2>
          <p className="text-xs text-slate-400 mt-0.5">Item-level differential item functioning via cumulative log-odds ratios</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-200 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {error && <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">{error}</div>}

      {/* KPI Cards */}
      {data && (
        <div className="grid grid-cols-5 gap-3">
          {kpiCards.map((kpi) => (
            <div key={kpi.label} className="bg-slate-800 rounded-xl p-3 border border-slate-700">
              <div className="flex items-center gap-1.5 mb-1" style={{ color: kpi.color }}>
                {kpi.icon}
                <span className="text-xs text-slate-400">{kpi.label}</span>
              </div>
              <div className="text-2xl font-bold text-white">{kpi.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400">Group:</span>
          {(["gender", "nativeLanguage", "ageGroup"] as GroupVar[]).map((g) => (
            <button
              key={g}
              onClick={() => setGroupVar(g)}
              className={`px-2 py-1 rounded text-xs transition-colors ${groupVar === g ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
            >
              {g === "nativeLanguage" ? "L1" : g}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400">Sort:</span>
          {(["logOddsRatio", "zScore", "pValue"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortKey(s)}
              className={`px-2 py-1 rounded text-xs transition-colors ${sortKey === s ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
            >
              {s === "logOddsRatio" ? "Log-OR" : s === "zScore" ? "Z" : "p-val"}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
          <input type="checkbox" className="accent-indigo-500" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} />
          Flagged only
        </label>
        <input
          type="text"
          placeholder="Search item / skill…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[160px] bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-700">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === t.id ? "border-indigo-500 text-white" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center justify-center h-40 text-slate-400 text-sm"
          >
            <RefreshCw size={20} className="animate-spin mr-2" /> Loading…
          </motion.div>
        )}

        {!loading && activeTab === "items" && (
          <motion.div key="items" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {displayItems.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">No items found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-slate-300">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-700">
                      <th className="text-left py-2 pr-4">Item</th>
                      <th className="text-left py-2 pr-4">Skill</th>
                      <th className="text-left py-2 pr-4">CEFR</th>
                      <th className="text-right py-2 pr-4">N Ref</th>
                      <th className="text-right py-2 pr-4">N Foc</th>
                      <th className="text-right py-2 pr-4">Log-OR</th>
                      <th className="text-right py-2 pr-4">SE</th>
                      <th className="text-right py-2 pr-4">Z</th>
                      <th className="text-right py-2 pr-4">p</th>
                      <th className="text-left py-2">Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayItems.map((it) => (
                      <tr key={it.itemId} className={`border-b border-slate-800 hover:bg-slate-800/50 ${it.flagged ? "bg-red-900/10" : ""}`}>
                        <td className="py-2 pr-4 font-mono text-slate-400">{it.itemLabel}</td>
                        <td className="py-2 pr-4">
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium" style={{ background: (SKILL_COLORS[it.skill] ?? "#64748b") + "22", color: SKILL_COLORS[it.skill] ?? "#94a3b8" }}>
                            {it.skill}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-slate-400">{it.cefrLevel}</td>
                        <td className="py-2 pr-4 text-right">{it.nRef}</td>
                        <td className="py-2 pr-4 text-right">{it.nFoc}</td>
                        <td className={`py-2 pr-4 text-right font-mono ${Math.abs(it.logOddsRatio) > 0.69 ? "text-amber-400" : "text-slate-300"}`}>
                          {it.logOddsRatio.toFixed(3)}
                        </td>
                        <td className="py-2 pr-4 text-right text-slate-400">{it.seLogOdds.toFixed(3)}</td>
                        <td className={`py-2 pr-4 text-right font-mono ${Math.abs(it.zScore) > 1.96 ? "text-red-400" : "text-slate-300"}`}>
                          {it.zScore.toFixed(2)}
                        </td>
                        <td className="py-2 pr-4 text-right text-slate-400">{it.pValue.toFixed(3)}</td>
                        <td className="py-2"><SeverityBadge sev={it.severity} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {!loading && activeTab === "bySkill" && (
          <motion.div key="bySkill" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="bg-slate-800 rounded-xl p-4 space-y-3">
              <div className="text-xs text-slate-400 mb-2">Flagged items per skill</div>
              {(data?.bySkill ?? []).map((row) => (
                <div key={row.skill} className="space-y-1">
                  <BarRow label={row.skill} value={row.flagged} max={maxSkill} color={SKILL_COLORS[row.skill] ?? "#64748b"} />
                  <div className="ml-30 text-xs text-slate-500 pl-32">{row.flagged}/{row.total} items flagged</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {!loading && activeTab === "byCefr" && (
          <motion.div key="byCefr" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="bg-slate-800 rounded-xl p-4 space-y-3">
              <div className="text-xs text-slate-400 mb-2">Flagged items per CEFR level</div>
              {CEFR_ORDER.map((level) => {
                const row = data?.byCefr.find((c) => c.cefrLevel === level);
                if (!row) return null;
                return (
                  <div key={level} className="space-y-1">
                    <BarRow label={level} value={row.flagged} max={maxCefr} color="#6366f1" />
                    <div className="text-xs text-slate-500 pl-32">{row.flagged}/{row.total} flagged</div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
