import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, AlertTriangle, CheckCircle2, UserX, Timer } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PersonFitRow {
  sessionId: string;
  candidateId: string;
  lzStat: number;        // Drasgow standardised lz (z-score)
  aberrantItems: number;
  totalItems: number;
  rapidGuessCount: number;
  meanRtZScore: number;
  flagLevel: "NONE" | "WATCH" | "FLAG" | "SEVERE";
  cefrLevel: string;
  completedAt: string;
}

interface RtFlagSummary {
  flag: string;
  count: number;
  pct: number;
}

interface PersonFitPayload {
  sampleSize: number;
  flaggedSessions: number;
  severeSessions: number;
  meanLz: number;
  sdLz: number;
  rtFlagSummary: RtFlagSummary[];
  sessions: PersonFitRow[];
  lzHistogram: { bin: number; count: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function flagBadge(level: PersonFitRow["flagLevel"]) {
  const map: Record<string, string> = {
    NONE: "bg-emerald-900/60 text-emerald-300",
    WATCH: "bg-amber-900/60 text-amber-300",
    FLAG: "bg-orange-900/60 text-orange-300",
    SEVERE: "bg-red-900/60 text-red-300",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${map[level] ?? ""}`}>
      {level}
    </span>
  );
}

function lzColor(lz: number): string {
  if (lz > -1.64) return "text-emerald-400";
  if (lz > -2.00) return "text-amber-400";
  if (lz > -2.58) return "text-orange-400";
  return "text-red-400";
}

const CEFR_COLORS: Record<string, string> = {
  PRE_A1: "#475569", A1: "#3b82f6", A2: "#06b6d4",
  B1: "#10b981", B2: "#f59e0b", C1: "#f97316", C2: "#ef4444",
};

// ─── lz Histogram ─────────────────────────────────────────────────────────────

const LzHistogram: React.FC<{ bins: { bin: number; count: number }[] }> = ({ bins }) => {
  if (bins.length === 0) return <p className="text-slate-500 text-sm text-center py-8">No data.</p>;
  const maxCount = Math.max(...bins.map((b) => b.count), 1);
  return (
    <div className="flex items-end gap-0.5 h-28">
      {bins.map((b, i) => {
        const pct = b.count / maxCount;
        const isFlag = b.bin <= -1.64;
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5" title={`lz≈${b.bin.toFixed(1)}: ${b.count}`}>
            <div
              className="w-full rounded-t-sm"
              style={{
                height: `${Math.max(2, pct * 100)}px`,
                backgroundColor: isFlag ? (b.bin <= -2.58 ? "#ef4444" : "#f97316") : "#10b981",
              }}
            />
            {i % 4 === 0 && <span className="text-[8px] text-slate-500">{b.bin.toFixed(0)}</span>}
          </div>
        );
      })}
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const PersonFitPanel: React.FC = () => {
  const [data, setData] = useState<PersonFitPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"sessions" | "rt" | "distribution">("sessions");
  const [onlyFlagged, setOnlyFlagged] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/psychometrics/person-fit")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const displayRows = data
    ? (onlyFlagged ? data.sessions.filter((s) => s.flagLevel !== "NONE") : data.sessions)
    : [];

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UserX size={20} className="text-orange-400" />
            Person Fit &amp; Aberrant Response Detection
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Drasgow standardised lz statistic; RT-IRT rapid-guess flags (van der Linden 2006)
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
            { label: "Sessions Analysed", value: data.sampleSize.toLocaleString(), color: "text-orange-400" },
            { label: "Flagged Sessions", value: data.flaggedSessions.toString(), color: data.flaggedSessions > 0 ? "text-amber-400" : "text-emerald-400" },
            { label: "Severe Aberrance", value: data.severeSessions.toString(), color: data.severeSessions > 0 ? "text-red-400" : "text-emerald-400" },
            { label: "Mean lz", value: data.meanLz.toFixed(2), color: lzColor(data.meanLz) },
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

      {/* Tabs + controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["sessions", "rt", "distribution"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-orange-700 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
          >
            {t === "sessions" ? "Session Fit" : t === "rt" ? "RT Flags" : "lz Distribution"}
          </button>
        ))}
        {tab === "sessions" && (
          <label className="ml-auto flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyFlagged}
              onChange={(e) => setOnlyFlagged(e.target.checked)}
              className="accent-orange-500"
            />
            Only flagged
          </label>
        )}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="load" className="flex justify-center py-16 text-slate-500 text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Loading person-fit statistics…
          </motion.div>
        ) : data && tab === "sessions" ? (
          <motion.div key="sessions" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-900">
                  <tr>
                    {["Session", "CEFR", "lz", "Aberrant Items", "Rapid Guesses", "Mean RT-z", "Flag"].map((h) => (
                      <th key={h} className="text-left text-slate-400 text-xs px-3 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayRows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-500 text-sm">
                        <CheckCircle2 size={24} className="mx-auto mb-2 text-emerald-500" />
                        No aberrant sessions found.
                      </td>
                    </tr>
                  )}
                  {displayRows.map((s) => (
                    <tr key={s.sessionId} className="border-t border-slate-700 hover:bg-slate-700/30 transition-colors">
                      <td className="px-3 py-2 text-slate-400 font-mono text-xs">{s.sessionId.slice(-10)}</td>
                      <td className="px-3 py-2">
                        <span
                          className="px-1.5 py-0.5 rounded text-xs font-semibold text-white"
                          style={{ backgroundColor: CEFR_COLORS[s.cefrLevel] ?? "#475569" }}
                        >
                          {s.cefrLevel.replace("_", "")}
                        </span>
                      </td>
                      <td className={`px-3 py-2 font-semibold ${lzColor(s.lzStat)}`}>{s.lzStat.toFixed(2)}</td>
                      <td className="px-3 py-2 text-slate-300">{s.aberrantItems}/{s.totalItems}</td>
                      <td className="px-3 py-2 text-slate-300">{s.rapidGuessCount}</td>
                      <td className={`px-3 py-2 font-semibold ${Math.abs(s.meanRtZScore) > 2 ? "text-red-400" : "text-slate-300"}`}>
                        {s.meanRtZScore.toFixed(2)}
                      </td>
                      <td className="px-3 py-2">{flagBadge(s.flagLevel)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : data && tab === "rt" ? (
          <motion.div key="rt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* RT flag breakdown */}
            <div className="grid grid-cols-3 gap-4">
              {data.rtFlagSummary.map((f) => (
                <div key={f.flag} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <p className="text-slate-400 text-xs mb-1">{f.flag.replace(/_/g, " ")}</p>
                  <p className={`text-2xl font-bold ${f.flag === "RAPID_GUESS" ? "text-red-400" : f.flag === "SOLUTION_BEHAVIOR" ? "text-amber-400" : "text-emerald-400"}`}>
                    {f.count.toLocaleString()}
                  </p>
                  <p className="text-slate-400 text-xs">{f.pct.toFixed(1)}% of responses</p>
                </div>
              ))}
            </div>
            {/* Reference */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 text-slate-400 text-xs flex gap-2">
              <Timer size={13} className="text-orange-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-300">RT-IRT flag criteria:</strong>{" "}
                <span className="text-red-400">RAPID_GUESS</span>: response in &lt;10% expected time (z &lt; −2.58).{" "}
                <span className="text-amber-400">SOLUTION_BEHAVIOR</span>: response &gt;300% expected time (z &gt; 2.58).{" "}
                Flags from van der Linden hierarchical model (2006). Stored in <code>Response.rtFlag</code>.
              </span>
            </div>
          </motion.div>
        ) : data && tab === "distribution" ? (
          <motion.div key="dist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-1">lz Distribution (last 500 sessions)</h3>
            <p className="text-slate-500 text-xs mb-4">
              Critical values: lz &lt; −1.64 (p=0.05), &lt; −2.33 (p=0.01), &lt; −2.58 (p=0.005)
            </p>
            <LzHistogram bins={data.lzHistogram} />
            <div className="mt-3 flex gap-4 text-[11px] text-slate-400">
              {[
                { color: "bg-emerald-500", label: "lz ≥ −1.64 — Fitting" },
                { color: "bg-orange-500", label: "lz −1.64 to −2.58 — Flagged" },
                { color: "bg-red-500", label: "lz < −2.58 — Severe" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded ${l.color}`} />
                  <span>{l.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
