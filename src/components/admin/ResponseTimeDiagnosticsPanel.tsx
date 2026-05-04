import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, Clock, AlertTriangle, CheckCircle2, Activity } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ItemRT {
  itemId: string;
  skill: string;
  cefrLevel: string;
  medianLatency: number;   // ms
  meanLatency: number;
  sdLatency: number;
  timeBeta: number;        // log-normal β (time intensity)
  rapidGuessPct: number;   // pct responses flagged RAPID_GUESS
  slowPct: number;         // pct > 3 SD above mean (slow)
  nResponses: number;
}

interface SessionSpeed {
  sessionId: string;
  candidateId: string;
  tauEstimate: number;     // person speed factor (positive = faster)
  meanRtZScore: number;
  rapidGuessCount: number;
  totalItems: number;
  rapidGuessPct: number;
  cefrLevel: string;
}

interface RTPayload {
  totalResponses: number;
  rapidGuessCount: number;
  solutionBehaviorCount: number;
  normalCount: number;
  rapidGuessPct: number;
  meanLatencyMs: number;
  medianLatencyMs: number;
  p95LatencyMs: number;
  latencyHistogram: { bin: number; count: number }[];
  rtZScoreHistogram: { bin: number; count: number }[];
  itemRTs: ItemRT[];
  sessionSpeeds: SessionSpeed[];
  bySkill: { skill: string; medianLatency: number; rapidGuessPct: number }[];
  byCefr: { cefrLevel: string; medianLatency: number; rapidGuessPct: number }[];
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

const LatencyHistogram: React.FC<{ bins: { bin: number; count: number }[]; color: string; xUnit?: string }> = ({ bins, color, xUnit = "ms" }) => {
  const maxC = Math.max(...bins.map((b) => b.count), 1);
  return (
    <div className="flex items-end gap-px h-28">
      {bins.map((b, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm"
          style={{ height: `${Math.max(2, (b.count / maxC) * 104)}px`, backgroundColor: color }}
          title={`${b.bin}${xUnit}: ${b.count}`}
        />
      ))}
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const ResponseTimeDiagnosticsPanel: React.FC = () => {
  const [data, setData] = useState<RTPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "items" | "sessions" | "distributions">("overview");
  const [sortBy, setSortBy] = useState<"rapidGuessPct" | "timeBeta" | "medianLatency">("rapidGuessPct");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/psychometrics/rt-diagnostics")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const displayItems = data
    ? [...data.itemRTs].sort((a, b) => {
        if (sortBy === "rapidGuessPct") return b.rapidGuessPct - a.rapidGuessPct;
        if (sortBy === "timeBeta") return b.timeBeta - a.timeBeta;
        return b.medianLatency - a.medianLatency;
      }).slice(0, 80)
    : [];

  const displaySessions = data
    ? [...data.sessionSpeeds].sort((a, b) => b.rapidGuessPct - a.rapidGuessPct).slice(0, 100)
    : [];

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock size={20} className="text-sky-400" />
            Response Time Diagnostics
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Log-normal RT model, rapid-guess detection, person speed (van der Linden, 2006)
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

      {error && <div className="bg-red-900/40 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>}

      {/* KPI cards */}
      {data && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "Total Responses", value: data.totalResponses.toLocaleString(), color: "text-sky-400" },
            { label: "Rapid Guesses", value: `${data.rapidGuessPct.toFixed(1)}%`, color: data.rapidGuessPct > 10 ? "text-red-400" : "text-emerald-400" },
            { label: "Median RT", value: `${(data.medianLatencyMs / 1000).toFixed(1)}s`, color: "text-blue-400" },
            { label: "Mean RT", value: `${(data.meanLatencyMs / 1000).toFixed(1)}s`, color: "text-slate-300" },
            { label: "P95 RT", value: `${(data.p95LatencyMs / 1000).toFixed(1)}s`, color: "text-amber-400" },
          ].map((k) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800 border border-slate-700 rounded-xl p-3">
              <p className="text-slate-400 text-xs mb-1">{k.label}</p>
              <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* RT flag summary row */}
      {data && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "RAPID_GUESS", count: data.rapidGuessCount, color: "text-red-400", bg: "border-red-800" },
            { label: "SOLUTION_BEHAVIOR", count: data.solutionBehaviorCount, color: "text-amber-400", bg: "border-amber-800" },
            { label: "NORMAL", count: data.normalCount, color: "text-emerald-400", bg: "border-emerald-800" },
          ].map((f) => (
            <div key={f.label} className={`bg-slate-800 border rounded-xl p-3 flex items-center gap-3 ${f.bg}`}>
              <Activity size={16} className={f.color} />
              <div>
                <p className="text-slate-400 text-xs">{f.label}</p>
                <p className={`text-lg font-bold ${f.color}`}>{f.count.toLocaleString()}</p>
              </div>
              <span className="ml-auto text-slate-500 text-xs">
                {data.totalResponses > 0 ? ((f.count / data.totalResponses) * 100).toFixed(1) : "0.0"}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["overview", "items", "sessions", "distributions"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-sky-700 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
            {t === "overview" ? "By Skill / CEFR" : t === "items" ? "Item RT Table" : t === "sessions" ? "Session Speeds" : "Distributions"}
          </button>
        ))}
        {tab === "items" && (
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}
            className="ml-auto bg-slate-700 border border-slate-600 text-slate-200 text-xs rounded-lg px-2 py-1">
            <option value="rapidGuessPct">Sort by rapid-guess %</option>
            <option value="timeBeta">Sort by time intensity β</option>
            <option value="medianLatency">Sort by median RT</option>
          </select>
        )}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="load" className="flex justify-center py-16 text-slate-500 text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Analysing response times…
          </motion.div>
        ) : data && tab === "overview" ? (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-4">
            {/* By Skill */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Median RT by Skill</h3>
              <div className="space-y-3">
                {data.bySkill.map((s) => (
                  <div key={s.skill} className="flex items-center gap-3">
                    <span className="text-xs w-24 font-medium" style={{ color: SKILL_COLORS[s.skill] ?? "#94a3b8" }}>{s.skill}</span>
                    <div className="flex-1 h-4 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${Math.min(100, (s.medianLatency / 60000) * 100)}%`,
                        backgroundColor: SKILL_COLORS[s.skill] ?? "#94a3b8",
                      }} />
                    </div>
                    <span className="text-slate-300 text-xs w-14 text-right">{(s.medianLatency / 1000).toFixed(1)}s</span>
                    <span className={`text-xs w-14 text-right ${s.rapidGuessPct > 10 ? "text-red-400" : "text-slate-500"}`}>
                      {s.rapidGuessPct.toFixed(1)}% RG
                    </span>
                  </div>
                ))}
              </div>
            </div>
            {/* By CEFR */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Median RT by CEFR Level</h3>
              <div className="space-y-3">
                {data.byCefr.map((c) => (
                  <div key={c.cefrLevel} className="flex items-center gap-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] text-white font-semibold w-14 text-center"
                      style={{ backgroundColor: CEFR_BG[c.cefrLevel] ?? "#475569" }}>
                      {c.cefrLevel.replace("_", "")}
                    </span>
                    <div className="flex-1 h-4 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${Math.min(100, (c.medianLatency / 60000) * 100)}%`,
                        backgroundColor: CEFR_BG[c.cefrLevel] ?? "#475569",
                      }} />
                    </div>
                    <span className="text-slate-300 text-xs w-14 text-right">{(c.medianLatency / 1000).toFixed(1)}s</span>
                    <span className={`text-xs w-14 text-right ${c.rapidGuessPct > 10 ? "text-red-400" : "text-slate-500"}`}>
                      {c.rapidGuessPct.toFixed(1)}% RG
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : data && tab === "items" ? (
          <motion.div key="items" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-900">
                  <tr>
                    {["Item", "Skill", "CEFR", "Median RT", "Mean RT", "SD RT", "β (intensity)", "RG%", "Slow%", "n"].map((h) => (
                      <th key={h} className="text-left text-slate-400 text-xs px-2 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayItems.length === 0 && (
                    <tr><td colSpan={10} className="text-center py-8 text-slate-500 text-sm">No item RT data available.</td></tr>
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
                      <td className="px-2 py-1.5 text-slate-300 text-xs">{(item.medianLatency / 1000).toFixed(1)}s</td>
                      <td className="px-2 py-1.5 text-slate-400 text-xs">{(item.meanLatency / 1000).toFixed(1)}s</td>
                      <td className="px-2 py-1.5 text-slate-500 text-xs">{(item.sdLatency / 1000).toFixed(1)}s</td>
                      <td className="px-2 py-1.5 text-slate-300 text-xs">{item.timeBeta.toFixed(2)}</td>
                      <td className={`px-2 py-1.5 text-xs font-semibold ${item.rapidGuessPct > 15 ? "text-red-400" : item.rapidGuessPct > 5 ? "text-amber-400" : "text-emerald-400"}`}>
                        {item.rapidGuessPct.toFixed(1)}%
                      </td>
                      <td className={`px-2 py-1.5 text-xs ${item.slowPct > 20 ? "text-amber-400" : "text-slate-500"}`}>
                        {item.slowPct.toFixed(1)}%
                      </td>
                      <td className="px-2 py-1.5 text-slate-500 text-xs">{item.nResponses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : data && tab === "sessions" ? (
          <motion.div key="sessions" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-900">
                  <tr>
                    {["Session", "CEFR", "τ̂ (speed)", "Mean RT-z", "RG Count", "RG %", "Items"].map((h) => (
                      <th key={h} className="text-left text-slate-400 text-xs px-2 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displaySessions.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-slate-500 text-sm">No session RT data.</td></tr>
                  )}
                  {displaySessions.map((s) => (
                    <tr key={s.sessionId} className="border-t border-slate-700 hover:bg-slate-700/30">
                      <td className="px-2 py-1.5 text-slate-400 font-mono text-[10px]">{s.sessionId.slice(-10)}</td>
                      <td className="px-2 py-1.5">
                        <span className="px-1 py-0.5 rounded text-[10px] text-white font-semibold"
                          style={{ backgroundColor: CEFR_BG[s.cefrLevel] ?? "#475569" }}>
                          {s.cefrLevel.replace("_", "")}
                        </span>
                      </td>
                      <td className={`px-2 py-1.5 text-xs font-semibold ${s.tauEstimate > 0.5 ? "text-sky-400" : s.tauEstimate < -0.5 ? "text-amber-400" : "text-slate-300"}`}>
                        {s.tauEstimate >= 0 ? "+" : ""}{s.tauEstimate.toFixed(2)}
                      </td>
                      <td className={`px-2 py-1.5 text-xs ${s.meanRtZScore < -2 ? "text-red-400" : "text-slate-300"}`}>
                        {s.meanRtZScore.toFixed(2)}
                      </td>
                      <td className={`px-2 py-1.5 text-xs font-semibold ${s.rapidGuessCount > 3 ? "text-red-400" : "text-slate-400"}`}>
                        {s.rapidGuessCount}
                      </td>
                      <td className={`px-2 py-1.5 text-xs ${s.rapidGuessPct > 20 ? "text-red-400" : s.rapidGuessPct > 10 ? "text-amber-400" : "text-slate-400"}`}>
                        {s.rapidGuessPct.toFixed(1)}%
                      </td>
                      <td className="px-2 py-1.5 text-slate-500 text-xs">{s.totalItems}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : data && tab === "distributions" ? (
          <motion.div key="distributions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-slate-300 mb-1">Response Latency Distribution</h3>
              <p className="text-[10px] text-slate-500 mb-3">Log-normal expected; right skew indicates slow outliers</p>
              <LatencyHistogram bins={data.latencyHistogram} color="#0ea5e9" xUnit="s" />
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-slate-300 mb-1">RT Z-Score Distribution</h3>
              <p className="text-[10px] text-slate-500 mb-3">Left tail (&lt;−2) = rapid guess; right tail (&gt;+2) = slow/solution behaviour</p>
              <LatencyHistogram bins={data.rtZScoreHistogram} color="#8b5cf6" xUnit="" />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
