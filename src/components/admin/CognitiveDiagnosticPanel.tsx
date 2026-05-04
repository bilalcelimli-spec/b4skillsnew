import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, Wand2, CheckCircle2, AlertTriangle, Brain } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type MasteryLevel = "NON_MASTER" | "BORDERLINE" | "MASTER";

interface AttributeProfile {
  attribute: string;   // e.g. "GRAMMAR", "VOCABULARY", etc.
  masterCount: number;
  borderlineCount: true extends true ? number : never;
  nonMasterCount: number;
  masteryRate: number; // 0-1
  totalCandidates: number;
}

interface CandidateDiag {
  candidateId: string;
  sessionId: string;
  cefrLevel: string;
  attributes: { attribute: string; posteriorMastery: number; masteryLevel: MasteryLevel }[];
  totalAttributes: number;
  masteredCount: number;
  overallMasteryRate: number;
}

interface DiagPayload {
  totalCandidates: number;
  totalAttributes: number;
  meanMasteryRate: number;
  attributeProfiles: AttributeProfile[];
  candidates: CandidateDiag[];
  masteryDistribution: { level: MasteryLevel; count: number; pct: number }[];
  attributeCorrelations: { pair: string; correlation: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MASTERY_COLORS: Record<MasteryLevel, string> = {
  MASTER: "#10b981",
  BORDERLINE: "#f59e0b",
  NON_MASTER: "#ef4444",
};

const ATTR_COLORS: Record<string, string> = {
  GRAMMAR: "#3b82f6",
  VOCABULARY: "#10b981",
  READING: "#f59e0b",
  LISTENING: "#8b5cf6",
  WRITING: "#ef4444",
  SPEAKING: "#f97316",
};

const CEFR_BG: Record<string, string> = {
  PRE_A1: "#475569", A1: "#3b82f6", A2: "#06b6d4",
  B1: "#10b981", B2: "#f59e0b", C1: "#f97316", C2: "#ef4444",
};

function masteryBadge(level: MasteryLevel) {
  const labels: Record<MasteryLevel, string> = { MASTER: "Master", BORDERLINE: "Borderline", NON_MASTER: "Non-Master" };
  const bg: Record<MasteryLevel, string> = { MASTER: "bg-emerald-900/60 text-emerald-300", BORDERLINE: "bg-amber-900/60 text-amber-300", NON_MASTER: "bg-red-900/60 text-red-300" };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${bg[level]}`}>
      {labels[level]}
    </span>
  );
}

// ─── Attribute Mastery Bar ────────────────────────────────────────────────────

const MasteryBar: React.FC<{ profile: AttributeProfile }> = ({ profile }) => {
  const masterPct = (profile.masterCount / Math.max(1, profile.totalCandidates)) * 100;
  const borderlinePct = (profile.borderlineCount / Math.max(1, profile.totalCandidates)) * 100;
  const nonPct = (profile.nonMasterCount / Math.max(1, profile.totalCandidates)) * 100;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs w-24 font-medium" style={{ color: ATTR_COLORS[profile.attribute] ?? "#94a3b8" }}>
        {profile.attribute}
      </span>
      <div className="flex-1 h-4 bg-slate-700 rounded-full overflow-hidden flex">
        <div className="h-full bg-emerald-500" style={{ width: `${masterPct}%` }} title={`Master: ${masterPct.toFixed(0)}%`} />
        <div className="h-full bg-amber-500" style={{ width: `${borderlinePct}%` }} title={`Borderline: ${borderlinePct.toFixed(0)}%`} />
        <div className="h-full bg-red-500" style={{ width: `${nonPct}%` }} title={`Non-Master: ${nonPct.toFixed(0)}%`} />
      </div>
      <span className="text-slate-300 text-xs w-12 text-right">{(profile.masteryRate * 100).toFixed(0)}%</span>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const CognitiveDiagnosticPanel: React.FC = () => {
  const [data, setData] = useState<DiagPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"profiles" | "candidates" | "correlations">("profiles");
  const [selectedAttr, setSelectedAttr] = useState<string>("ALL");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/psychometrics/cognitive-diagnostic")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const displayCandidates = data
    ? data.candidates
        .filter((c) => selectedAttr === "ALL" || c.attributes.some((a) => a.attribute === selectedAttr))
        .slice(0, 100)
    : [];

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Brain size={20} className="text-violet-400" />
            Cognitive Diagnostic Model (CDM-DINA)
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Attribute mastery estimation via DINA slip/guess parameters (de la Torre, 2009)
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
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Candidates Assessed", value: data.totalCandidates.toLocaleString(), color: "text-violet-400" },
            { label: "Attributes Monitored", value: data.totalAttributes.toString(), color: "text-blue-400" },
            { label: "Mean Mastery Rate", value: `${(data.meanMasteryRate * 100).toFixed(1)}%`, color: "text-emerald-400" },
            {
              label: "Masters",
              value: data.masteryDistribution.find((m) => m.level === "MASTER")?.count.toString() ?? "0",
              color: "text-emerald-400",
            },
          ].map((k) => (
            <motion.div
              key={k.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800 border border-slate-700 rounded-xl p-3"
            >
              <p className="text-slate-400 text-xs mb-1">{k.label}</p>
              <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Mastery distribution pills */}
      {data && (
        <div className="flex gap-3 flex-wrap">
          {data.masteryDistribution.map((m) => (
            <div
              key={m.level}
              className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2"
            >
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: MASTERY_COLORS[m.level] }} />
              <span className="text-slate-300 text-sm">{m.level.replace("_", "-")}</span>
              <span className="text-white font-bold text-sm">{m.count}</span>
              <span className="text-slate-400 text-xs">({m.pct.toFixed(1)}%)</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["profiles", "candidates", "correlations"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-violet-700 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
          >
            {t === "profiles" ? "Attribute Profiles" : t === "candidates" ? "Candidate Profiles" : "Attribute Correlations"}
          </button>
        ))}
        {tab === "candidates" && data && (
          <select
            value={selectedAttr}
            onChange={(e) => setSelectedAttr(e.target.value)}
            className="ml-auto bg-slate-700 border border-slate-600 text-slate-200 text-xs rounded-lg px-2 py-1"
          >
            <option value="ALL">All attributes</option>
            {data.attributeProfiles.map((p) => (
              <option key={p.attribute} value={p.attribute}>{p.attribute}</option>
            ))}
          </select>
        )}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="load" className="flex justify-center py-16 text-slate-500 text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Estimating attribute mastery…
          </motion.div>
        ) : data && tab === "profiles" ? (
          <motion.div key="profiles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Mastery Distribution per Attribute</h3>
              {data.attributeProfiles.map((p) => <MasteryBar key={p.attribute} profile={p} />)}
            </div>
            <div className="flex gap-3 text-xs text-slate-400">
              {[
                { color: "bg-emerald-500", label: "Master (P ≥ 0.75)" },
                { color: "bg-amber-500", label: "Borderline (0.5–0.75)" },
                { color: "bg-red-500", label: "Non-Master (< 0.5)" },
              ].map((l) => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded ${l.color}`} />
                  <span>{l.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ) : data && tab === "candidates" ? (
          <motion.div key="candidates" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-900">
                  <tr>
                    {["Candidate", "CEFR", "Mastered / Total", "Overall", ...data.attributeProfiles.map((p) => p.attribute)].map((h) => (
                      <th key={h} className="text-left text-slate-400 text-xs px-2 py-2 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayCandidates.length === 0 && (
                    <tr>
                      <td colSpan={20} className="text-center py-8 text-slate-500 text-sm">No data available.</td>
                    </tr>
                  )}
                  {displayCandidates.map((c) => (
                    <tr key={c.sessionId} className="border-t border-slate-700 hover:bg-slate-700/30">
                      <td className="px-2 py-1.5 text-slate-400 font-mono text-[10px]">{c.candidateId.slice(-8)}</td>
                      <td className="px-2 py-1.5">
                        <span className="px-1 py-0.5 rounded text-[10px] text-white font-semibold" style={{ backgroundColor: CEFR_BG[c.cefrLevel] ?? "#475569" }}>
                          {c.cefrLevel.replace("_", "")}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-slate-300 text-xs">{c.masteredCount}/{c.totalAttributes}</td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1">
                          <div className="w-10 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${c.overallMasteryRate * 100}%` }} />
                          </div>
                          <span className="text-slate-400 text-[10px]">{(c.overallMasteryRate * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      {data.attributeProfiles.map((p) => {
                        const attr = c.attributes.find((a) => a.attribute === p.attribute);
                        return (
                          <td key={p.attribute} className="px-2 py-1.5 text-center">
                            {attr ? masteryBadge(attr.masteryLevel) : <span className="text-slate-600 text-[10px]">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : data && tab === "correlations" ? (
          <motion.div key="correlations" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">
              Inter-attribute Mastery Correlations (φ coefficient)
            </h3>
            {data.attributeCorrelations.length === 0 ? (
              <p className="text-slate-500 text-sm">Not enough data to compute correlations.</p>
            ) : (
              <div className="space-y-2">
                {data.attributeCorrelations
                  .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
                  .map((ac) => (
                    <div key={ac.pair} className="flex items-center gap-3">
                      <span className="text-slate-400 text-xs w-36">{ac.pair}</span>
                      <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden relative">
                        <div className="absolute top-0 left-1/2 w-0.5 h-full bg-slate-500" />
                        {ac.correlation >= 0 ? (
                          <div
                            className="absolute top-0 h-full bg-blue-500 rounded-r-full"
                            style={{ left: "50%", width: `${Math.abs(ac.correlation) * 50}%` }}
                          />
                        ) : (
                          <div
                            className="absolute top-0 h-full bg-red-500 rounded-l-full"
                            style={{ right: "50%", width: `${Math.abs(ac.correlation) * 50}%` }}
                          />
                        )}
                      </div>
                      <span className={`text-xs w-12 text-right font-mono ${ac.correlation > 0.3 ? "text-blue-400" : ac.correlation < -0.3 ? "text-red-400" : "text-slate-400"}`}>
                        {ac.correlation >= 0 ? "+" : ""}{ac.correlation.toFixed(3)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
