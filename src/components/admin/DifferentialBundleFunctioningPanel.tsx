import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, ShieldAlert, CheckCircle2, AlertTriangle, Filter } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type GroupVar = "gender" | "nativeLanguage" | "ageGroup";

interface DBFBundle {
  bundleId: string;          // skill + CEFR group, e.g. "GRAMMAR_B1"
  skill: string;
  cefrLevel: string;
  nItems: number;
  groupVar: GroupVar;
  groupRef: string;          // reference group label
  groupFoc: string;          // focal group label
  nRef: number;
  nFoc: number;
  deltaMHD: number;          // Mantel-Haenszel delta
  chiSquare: number;
  pValue: number;
  flagged: boolean;          // |ΔMHD| > 1.5 (ETS Category B) or > 1.0
  severity: "A" | "B" | "C"; // C = negligible, B = moderate, A = large
}

interface DBFPayload {
  totalBundles: number;
  flaggedBundles: number;
  categoryA: number;
  categoryB: number;
  categoryC: number;
  groupVarsAvailable: GroupVar[];
  bundles: DBFBundle[];
  bySkill: { skill: string; flagged: number; total: number }[];
  byCefr: { cefrLevel: string; flagged: number; total: number }[];
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

function severityColor(s: "A" | "B" | "C"): string {
  if (s === "A") return "text-red-400";
  if (s === "B") return "text-amber-400";
  return "text-emerald-400";
}
function severityBg(s: "A" | "B" | "C"): string {
  if (s === "A") return "bg-red-900/40 border-red-700";
  if (s === "B") return "bg-amber-900/40 border-amber-700";
  return "bg-emerald-900/20 border-emerald-800";
}

// ─── Component ────────────────────────────────────────────────────────────────

export const DifferentialBundleFunctioningPanel: React.FC = () => {
  const [data, setData] = useState<DBFPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"bundles" | "skill" | "cefr">("bundles");
  const [groupVar, setGroupVar] = useState<GroupVar>("gender");
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const load = useCallback((gv: GroupVar) => {
    setLoading(true);
    setError(null);
    fetch(`/api/psychometrics/dbf?groupVar=${gv}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => { load(groupVar); }, [load, groupVar]);

  const handleGroupChange = (gv: GroupVar) => {
    setGroupVar(gv);
    load(gv);
  };

  const displayBundles = data
    ? data.bundles
        .filter((b) => !flaggedOnly || b.flagged)
        .sort((a, b) => Math.abs(b.deltaMHD) - Math.abs(a.deltaMHD))
        .slice(0, 100)
    : [];

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldAlert size={20} className="text-rose-400" />
            Differential Bundle Functioning (DBF)
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Mantel-Haenszel ΔMHD analysis — item bundles tested for group-differential performance
          </p>
        </div>
        <div className="flex gap-2">
          <select value={groupVar} onChange={(e) => handleGroupChange(e.target.value as GroupVar)}
            className="bg-slate-700 border border-slate-600 text-slate-200 text-xs rounded-lg px-2 py-1.5">
            <option value="gender">Gender</option>
            <option value="nativeLanguage">Native Language</option>
            <option value="ageGroup">Age Group</option>
          </select>
          <button onClick={() => load(groupVar)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="bg-red-900/40 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>}

      {/* ETS severity legend */}
      <div className="flex gap-4 flex-wrap">
        {[
          { cat: "A", color: "text-red-400", bg: "bg-red-900/40 border-red-700", label: "Category A |ΔMHD|>1.5 — large DBF, review bundle" },
          { cat: "B", color: "text-amber-400", bg: "bg-amber-900/40 border-amber-700", label: "Category B |ΔMHD| 1.0–1.5 — moderate DBF" },
          { cat: "C", color: "text-emerald-400", bg: "bg-emerald-900/20 border-emerald-800", label: "Category C |ΔMHD|<1.0 — negligible" },
        ].map((l) => (
          <div key={l.cat} className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] ${l.bg} ${l.color}`}>
            <span className="font-bold">{l.cat}</span>
            <span className="text-slate-400">{l.label}</span>
          </div>
        ))}
      </div>

      {/* KPI cards */}
      {data && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "Bundles Tested", value: data.totalBundles.toLocaleString(), color: "text-rose-400" },
            { label: "Flagged", value: data.flaggedBundles.toString(), color: data.flaggedBundles > 0 ? "text-red-400" : "text-emerald-400" },
            { label: "Category A", value: data.categoryA.toString(), color: data.categoryA > 0 ? "text-red-400" : "text-slate-400" },
            { label: "Category B", value: data.categoryB.toString(), color: data.categoryB > 0 ? "text-amber-400" : "text-slate-400" },
            { label: "Category C", value: data.categoryC.toString(), color: "text-emerald-400" },
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
        {(["bundles", "skill", "cefr"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-rose-700 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
            {t === "bundles" ? "Bundle Table" : t === "skill" ? "By Skill" : "By CEFR"}
          </button>
        ))}
        {tab === "bundles" && (
          <label className="ml-auto flex items-center gap-1.5 text-slate-300 text-xs cursor-pointer">
            <input type="checkbox" checked={flaggedOnly} onChange={(e) => setFlaggedOnly(e.target.checked)} className="accent-rose-500" />
            Flagged only
          </label>
        )}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="load" className="flex justify-center py-16 text-slate-500 text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Running Mantel-Haenszel DBF analysis…
          </motion.div>
        ) : data && tab === "bundles" ? (
          <motion.div key="bundles" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-900">
                  <tr>
                    {["Bundle", "Skill", "CEFR", "Ref grp", "Foc grp", "nRef", "nFoc", "ΔMHD", "χ²", "p", "Cat"].map((h) => (
                      <th key={h} className="text-left text-slate-400 text-xs px-2 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayBundles.length === 0 && (
                    <tr>
                      <td colSpan={11} className="text-center py-8 text-slate-500 text-sm">
                        <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-500" />
                        No bundles flagged for {groupVar}.
                      </td>
                    </tr>
                  )}
                  {displayBundles.map((b, idx) => (
                    <tr key={idx} className="border-t border-slate-700 hover:bg-slate-700/30">
                      <td className="px-2 py-1.5 text-slate-400 text-xs font-mono">{b.bundleId}</td>
                      <td className="px-2 py-1.5 font-medium text-xs" style={{ color: SKILL_COLORS[b.skill] ?? "#94a3b8" }}>{b.skill}</td>
                      <td className="px-2 py-1.5">
                        <span className="px-1 py-0.5 rounded text-[10px] text-white font-semibold"
                          style={{ backgroundColor: CEFR_BG[b.cefrLevel] ?? "#475569" }}>
                          {b.cefrLevel.replace("_", "")}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-slate-400 text-xs">{b.groupRef}</td>
                      <td className="px-2 py-1.5 text-slate-400 text-xs">{b.groupFoc}</td>
                      <td className="px-2 py-1.5 text-slate-500 text-xs">{b.nRef}</td>
                      <td className="px-2 py-1.5 text-slate-500 text-xs">{b.nFoc}</td>
                      <td className={`px-2 py-1.5 text-xs font-mono font-semibold ${severityColor(b.severity)}`}>
                        {b.deltaMHD >= 0 ? "+" : ""}{b.deltaMHD.toFixed(2)}
                      </td>
                      <td className="px-2 py-1.5 text-slate-400 text-xs">{b.chiSquare.toFixed(2)}</td>
                      <td className={`px-2 py-1.5 text-xs ${b.pValue < 0.05 ? "text-red-400" : "text-slate-400"}`}>
                        {b.pValue.toFixed(3)}
                      </td>
                      <td className="px-2 py-1.5">
                        <span className={`text-[10px] font-bold ${severityColor(b.severity)}`}>{b.severity}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : data && tab === "skill" ? (
          <motion.div key="skill" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">DBF by Skill — {groupVar}</h3>
            <div className="space-y-3">
              {data.bySkill.map((s) => (
                <div key={s.skill} className="flex items-center gap-3">
                  <span className="text-xs w-24 font-medium" style={{ color: SKILL_COLORS[s.skill] ?? "#94a3b8" }}>{s.skill}</span>
                  <div className="flex-1 h-4 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${s.total > 0 ? (s.flagged / s.total) * 100 : 0}%`,
                      backgroundColor: s.flagged > 0 ? "#ef4444" : "#334155",
                    }} />
                  </div>
                  <span className={`text-xs font-semibold w-20 text-right ${s.flagged > 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {s.flagged}/{s.total} flagged
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ) : data && tab === "cefr" ? (
          <motion.div key="cefr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">DBF by CEFR Level — {groupVar}</h3>
            <div className="space-y-3">
              {data.byCefr.map((c) => (
                <div key={c.cefrLevel} className="flex items-center gap-3">
                  <span className="px-1.5 py-0.5 rounded text-[10px] text-white font-semibold w-14 text-center"
                    style={{ backgroundColor: CEFR_BG[c.cefrLevel] ?? "#475569" }}>
                    {c.cefrLevel.replace("_", "")}
                  </span>
                  <div className="flex-1 h-4 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${c.total > 0 ? (c.flagged / c.total) * 100 : 0}%`,
                      backgroundColor: c.flagged > 0 ? "#ef4444" : "#334155",
                    }} />
                  </div>
                  <span className={`text-xs font-semibold w-20 text-right ${c.flagged > 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {c.flagged}/{c.total} flagged
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
