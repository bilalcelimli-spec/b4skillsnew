/**
 * LongitudinalDIFPanel — DIF trend monitoring across administrations
 *
 * Tracks Differential Item Functioning (DIF) classification history
 * using ETS A/B/C scheme across test administrations (waves).
 * Identifies chronic DIF items, newly flagged items, and resolved items.
 *
 * References:
 *   Holland & Thayer (1988). Differential item performance and the MH procedure.
 *   Zwick (2012). A review of ETS DIF statistics. ETS Research Report.
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GitBranch, AlertTriangle, CheckCircle2, Clock, BarChart3, RefreshCw } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DifWave {
  runDate: string;
  classification: string;   // "A" | "B" | "C"
  mhDelta: number;
  groupVariable: string;
  focalGroup: string;
  pValue: number | null;
}

interface DifTrendItem {
  itemId: string;
  itemLabel: string;
  cefrLevel: string;
  skill: string;
  currentClassification: string;
  worstClassification: string;
  nWaves: number;
  nFlagged: number;           // waves with B or C
  nChronic: number;           // consecutive B/C waves
  latestMhDelta: number;
  trend: "WORSENING" | "IMPROVING" | "STABLE" | "CHRONIC";
  waves: DifWave[];
  groups: string[];
  status: string;
}

interface ClassificationFlow {
  from: string;
  to: string;
  count: number;
}

interface LongDIFPayload {
  nItemsMonitored: number;
  nWaves: number;
  nChronic: number;          // items flagged B/C in ≥3 consecutive waves
  nResolved: number;         // items previously flagged, now A
  nNewFlags: number;         // items newly flagged in latest wave
  items: DifTrendItem[];
  classificationFlow: ClassificationFlow[];
  groupBreakdown: { group: string; nFlagged: number; nTotal: number }[];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ClassBadge({ cls }: { cls: string }) {
  const style =
    cls === "C" ? "bg-red-500/20 text-red-300 border border-red-500/30"
    : cls === "B" ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
    : "bg-green-500/20 text-green-300 border border-green-500/30";
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${style}`}>{cls}</span>;
}

function WaveTimeline({ waves }: { waves: DifWave[] }) {
  if (!waves.length) return <span className="text-gray-500 text-xs">—</span>;
  const last5 = waves.slice(-6);
  return (
    <div className="flex gap-0.5 items-center">
      {last5.map((w, i) => (
        <div key={i} title={`${w.runDate}: Class ${w.classification}, Δ=${w.mhDelta.toFixed(2)}`}>
          <ClassBadge cls={w.classification} />
        </div>
      ))}
    </div>
  );
}

function TrendBadge({ trend }: { trend: string }) {
  const cfg: Record<string, { bg: string; text: string }> = {
    CHRONIC: { bg: "bg-red-500/20", text: "text-red-300" },
    WORSENING: { bg: "bg-orange-500/20", text: "text-orange-300" },
    STABLE: { bg: "bg-gray-500/20", text: "text-gray-300" },
    IMPROVING: { bg: "bg-green-500/20", text: "text-green-300" },
  };
  const c = cfg[trend] ?? cfg.STABLE;
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${c.bg} ${c.text}`}>{trend}</span>;
}

function SankeyMini({ flows }: { flows: ClassificationFlow[] }) {
  // Simple transition summary table
  const classes = ["A", "B", "C"];
  const matrix: Record<string, Record<string, number>> = {};
  for (const f of flows) {
    if (!matrix[f.from]) matrix[f.from] = {};
    matrix[f.from][f.to] = (matrix[f.from][f.to] ?? 0) + f.count;
  }
  return (
    <div>
      <p className="text-xs text-gray-400 mb-2">Classification transitions (wave N-1 → wave N)</p>
      <table className="w-full text-xs border-separate border-spacing-1">
        <thead>
          <tr>
            <th className="text-gray-500 text-left p-1">From \ To</th>
            {classes.map((c) => <th key={c} className="text-center p-1 text-gray-400">→ {c}</th>)}
          </tr>
        </thead>
        <tbody>
          {classes.map((from) => (
            <tr key={from}>
              <td className="p-1 font-medium text-gray-400">{from}</td>
              {classes.map((to) => {
                const count = matrix[from]?.[to] ?? 0;
                const isImproving = from > to;   // A < B < C, so B→A is improving
                const isWorsening = from < to;
                return (
                  <td key={to} className={`p-1 text-center rounded ${
                    from === to ? "bg-white/5 text-gray-300" :
                    isImproving ? "bg-green-500/10 text-green-300" :
                    isWorsening ? "bg-red-500/10 text-red-300" : ""
                  }`}>
                    {count > 0 ? count : "—"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

type TabId = "items" | "timeline" | "transitions" | "groups";

export function LongitudinalDIFPanel() {
  const [data, setData] = useState<LongDIFPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("items");
  const [filterChronic, setFilterChronic] = useState(false);
  const [sortField, setSortField] = useState<"nFlagged" | "latestMhDelta" | "nChronic">("nFlagged");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const load = () => {
    setLoading(true);
    setError(null);
    fetch("/api/psychometrics/longitudinal-dif")
      .then((r) => (r.ok ? r.json() : r.json().then((e: { error?: string }) => Promise.reject(e.error ?? "Error"))))
      .then((d: LongDIFPayload) => { setData(d); setLoading(false); })
      .catch((e: string) => { setError(String(e)); setLoading(false); });
  };

  useEffect(() => { load(); }, []);

  const kpis = data
    ? [
        { label: "Items Monitored", value: data.nItemsMonitored, icon: <BarChart3 size={16} />, color: "#6366f1", fmt: String },
        { label: "Chronic DIF Items", value: data.nChronic, icon: <AlertTriangle size={16} />, color: "#ef4444", fmt: String },
        { label: "Resolved", value: data.nResolved, icon: <CheckCircle2 size={16} />, color: "#22c55e", fmt: String },
        { label: "New Flags", value: data.nNewFlags, icon: <Clock size={16} />, color: "#f59e0b", fmt: String },
      ]
    : [];

  const tabs: { id: TabId; label: string }[] = [
    { id: "items", label: "Item Trends" },
    { id: "timeline", label: "Wave Timeline" },
    { id: "transitions", label: "Transitions" },
    { id: "groups", label: "Group Breakdown" },
  ];

  const sorted = data
    ? [...data.items]
        .filter((i) => !filterChronic || i.trend === "CHRONIC" || i.trend === "WORSENING")
        .sort((a, b) => (sortDir === "desc" ? b[sortField] - a[sortField] : a[sortField] - b[sortField]))
    : [];

  const toggleSort = (f: typeof sortField) => {
    if (sortField === f) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(f); setSortDir("desc"); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <RefreshCw size={20} className="animate-spin mr-2" />Loading DIF trend data…
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
          <h2 className="text-xl font-bold text-white">Longitudinal DIF Monitoring</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Mantel–Haenszel DIF classification history — chronic drift detection across administrations
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
        {/* Item Trends Table */}
        {activeTab === "items" && (
          <motion.div key="items" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center gap-3 mb-3">
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                <input type="checkbox" checked={filterChronic} onChange={(e) => setFilterChronic(e.target.checked)} className="rounded" />
                Flagged only (Chronic / Worsening)
              </label>
              <span className="text-xs text-gray-500">{sorted.length} items</span>
            </div>
            <div className="overflow-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-white/10">
                    <th className="text-left p-3">Item</th>
                    <th className="text-center p-3">Level / Skill</th>
                    <th className="text-center p-3">Current</th>
                    <th className="text-right p-3 cursor-pointer hover:text-white" onClick={() => toggleSort("nFlagged")}>
                      Flagged Waves{sortField === "nFlagged" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </th>
                    <th className="text-right p-3 cursor-pointer hover:text-white" onClick={() => toggleSort("nChronic")}>
                      Consecutive{sortField === "nChronic" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </th>
                    <th className="text-right p-3 cursor-pointer hover:text-white" onClick={() => toggleSort("latestMhDelta")}>
                      Latest Δ{sortField === "latestMhDelta" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </th>
                    <th className="text-center p-3">Wave History</th>
                    <th className="text-center p-3">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((item) => (
                    <tr key={item.itemId} className="border-b border-white/5 hover:bg-white/5">
                      <td className="p-3">
                        <div className="font-medium text-white text-xs">{item.itemLabel}</div>
                        <div className="text-[10px] text-gray-500">{item.itemId.slice(0, 8)}</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className="text-xs text-gray-300">{item.cefrLevel}</span>
                        <span className="mx-1 text-gray-600">·</span>
                        <span className="text-xs text-gray-400">{item.skill.slice(0, 4)}</span>
                      </td>
                      <td className="p-3 text-center"><ClassBadge cls={item.currentClassification} /></td>
                      <td className="p-3 text-right font-mono text-gray-300">{item.nFlagged}/{item.nWaves}</td>
                      <td className="p-3 text-right font-mono">
                        <span className={item.nChronic >= 3 ? "text-red-400 font-bold" : "text-gray-300"}>
                          {item.nChronic}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-gray-300">
                        {item.latestMhDelta > 0 ? "+" : ""}{item.latestMhDelta.toFixed(2)}
                      </td>
                      <td className="p-3"><WaveTimeline waves={item.waves} /></td>
                      <td className="p-3 text-center"><TrendBadge trend={item.trend} /></td>
                    </tr>
                  ))}
                  {sorted.length === 0 && (
                    <tr><td colSpan={8} className="p-8 text-center text-gray-500">No DIF history found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Wave Timeline */}
        {activeTab === "timeline" && (
          <motion.div key="timeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-sm font-medium text-white mb-4">Administration Wave Summary</h3>
              <p className="text-xs text-gray-400 mb-4">
                Showing DIF classification counts (A / B / C) per wave across all monitored items.
              </p>
              {data.nWaves === 0 ? (
                <p className="text-gray-500 text-sm">No wave data available yet.</p>
              ) : (
                <div className="space-y-2">
                  {Array.from({ length: data.nWaves }, (_, i) => {
                    const waveItems = data.items.flatMap((item) => item.waves.filter((_, wi) => wi === i));
                    const countA = waveItems.filter((w) => w.classification === "A").length;
                    const countB = waveItems.filter((w) => w.classification === "B").length;
                    const countC = waveItems.filter((w) => w.classification === "C").length;
                    const label = waveItems[0]?.runDate?.slice(0, 10) ?? `Wave ${i + 1}`;
                    const total = Math.max(1, countA + countB + countC);
                    return (
                      <div key={i} className="flex items-center gap-3 text-xs">
                        <span className="w-24 text-gray-400 text-right">{label}</span>
                        <div className="flex-1 flex rounded overflow-hidden h-5">
                          <div style={{ width: `${(countA / total) * 100}%` }} className="bg-green-600 flex items-center justify-center text-white text-[9px]">{countA > 0 ? countA : ""}</div>
                          <div style={{ width: `${(countB / total) * 100}%` }} className="bg-yellow-500 flex items-center justify-center text-white text-[9px]">{countB > 0 ? countB : ""}</div>
                          <div style={{ width: `${(countC / total) * 100}%` }} className="bg-red-500 flex items-center justify-center text-white text-[9px]">{countC > 0 ? countC : ""}</div>
                        </div>
                        <span className="text-gray-500 w-16 text-right">{countA}A {countB}B {countC}C</span>
                      </div>
                    );
                  })}
                  <div className="flex gap-4 text-[10px] text-gray-500 mt-2">
                    <span><span className="inline-block w-3 h-3 bg-green-600 rounded mr-1" />Class A (negligible)</span>
                    <span><span className="inline-block w-3 h-3 bg-yellow-500 rounded mr-1" />Class B (moderate)</span>
                    <span><span className="inline-block w-3 h-3 bg-red-500 rounded mr-1" />Class C (large)</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Classification Transitions */}
        {activeTab === "transitions" && (
          <motion.div key="transitions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <SankeyMini flows={data.classificationFlow} />
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <div className="bg-green-500/10 rounded p-3 text-center">
                  <div className="text-green-300 font-bold text-lg">{data.nResolved}</div>
                  <div className="text-gray-400">Items Resolved (B/C → A)</div>
                </div>
                <div className="bg-gray-500/10 rounded p-3 text-center">
                  <div className="text-gray-300 font-bold text-lg">
                    {data.classificationFlow.filter((f) => f.from === f.to).reduce((s, f) => s + f.count, 0)}
                  </div>
                  <div className="text-gray-400">Items Unchanged</div>
                </div>
                <div className="bg-red-500/10 rounded p-3 text-center">
                  <div className="text-red-300 font-bold text-lg">{data.nNewFlags}</div>
                  <div className="text-gray-400">New Flags (A → B/C)</div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                ETS classification: A = |MH Δ| &lt; 1.0, B = 1.0–1.5, C = &gt; 1.5 (Holland & Thayer, 1988).
                Items with Class C in ≥ 3 consecutive waves are flagged for review or retirement.
              </p>
            </div>
          </motion.div>
        )}

        {/* Group Breakdown */}
        {activeTab === "groups" && (
          <motion.div key="groups" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="overflow-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-white/10">
                    <th className="text-left p-3">Group Variable</th>
                    <th className="text-right p-3">Items Flagged (B/C)</th>
                    <th className="text-right p-3">Total DIF Tests</th>
                    <th className="text-right p-3">Flag Rate</th>
                    <th className="text-center p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.groupBreakdown.map((g) => {
                    const rate = g.nTotal > 0 ? g.nFlagged / g.nTotal : 0;
                    return (
                      <tr key={g.group} className="border-b border-white/5 hover:bg-white/5">
                        <td className="p-3 font-medium text-white capitalize">{g.group}</td>
                        <td className="p-3 text-right font-mono text-gray-300">{g.nFlagged}</td>
                        <td className="p-3 text-right font-mono text-gray-300">{g.nTotal}</td>
                        <td className="p-3 text-right font-mono">
                          <span className={rate > 0.15 ? "text-red-400 font-bold" : rate > 0.08 ? "text-yellow-400" : "text-green-400"}>
                            {(rate * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {rate > 0.15 ? (
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-red-500/20 text-red-300">HIGH</span>
                          ) : rate > 0.08 ? (
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-yellow-500/20 text-yellow-300">MODERATE</span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-green-500/20 text-green-300">OK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {data.groupBreakdown.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-500">No group data available.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-3 px-1">
              Flag rate &gt; 15%: systematic group-level bias requiring review.
              Group variables: gender, nativeLanguage, ageGroup (from CandidateProfile).
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
