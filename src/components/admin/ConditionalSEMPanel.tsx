import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, Activity, CheckCircle2, AlertTriangle } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SEMPoint {
  theta: number;
  sem: number;
  info: number;   // Fisher information I(θ) = 1/SEM²
}

interface SkillSEMCurve {
  skill: string;
  points: SEMPoint[];
  peakInfoTheta: number;
  peakInfo: number;
  minSEM: number;
  targetSEMTheta: number;   // θ where SEM first drops below 0.35
}

interface SessionSEMRecord {
  sessionId: string;
  theta: number;
  sem: number;
  cefrLevel: string;
  nItems: number;
  precisionOK: boolean;   // SEM ≤ 0.35
}

interface CSEMPayload {
  thetaGrid: number[];
  overallCurve: SEMPoint[];
  byCurve: SkillSEMCurve[];
  sessions: SessionSEMRecord[];
  pctPrecisionOK: number;     // % sessions achieving SEM ≤ 0.35
  meanSEM: number;
  medianSEM: number;
  semByNItems: { nItems: number; meanSEM: number }[];
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

const SEM_TARGET = 0.35;

// ─── SVG SEM Curve ────────────────────────────────────────────────────────────

const SEMCurveSVG: React.FC<{
  points: SEMPoint[];
  color: string;
  label: string;
  width?: number;
  height?: number;
}> = ({ points, color, label, width = 460, height = 140 }) => {
  if (points.length === 0) return <div className="text-slate-500 text-xs">No data</div>;

  const PAD = { top: 12, right: 16, bottom: 28, left: 36 };
  const W = width - PAD.left - PAD.right;
  const H = height - PAD.top - PAD.bottom;

  const thetas = points.map((p) => p.theta);
  const sems = points.map((p) => p.sem);
  const tMin = Math.min(...thetas), tMax = Math.max(...thetas);
  const sMin = 0, sMax = Math.max(...sems, 0.8);

  const tx = (t: number) => PAD.left + ((t - tMin) / (tMax - tMin || 1)) * W;
  const ty = (s: number) => PAD.top + H - ((s - sMin) / (sMax - sMin || 1)) * H;

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${tx(p.theta).toFixed(1)},${ty(p.sem).toFixed(1)}`).join(" ");

  // Target line y
  const targetY = ty(SEM_TARGET);
  const targetVisible = SEM_TARGET >= sMin && SEM_TARGET <= sMax;

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Grid */}
      {[0.2, 0.4, 0.6, 0.8].filter((v) => v <= sMax).map((v) => (
        <line key={v} x1={PAD.left} x2={PAD.left + W} y1={ty(v)} y2={ty(v)}
          stroke="#334155" strokeWidth={1} strokeDasharray="3,3" />
      ))}
      {/* Target SEM line */}
      {targetVisible && (
        <line x1={PAD.left} x2={PAD.left + W} y1={targetY} y2={targetY}
          stroke="#f59e0b" strokeWidth={1} strokeDasharray="5,3" />
      )}
      {targetVisible && (
        <text x={PAD.left + W + 2} y={targetY + 3} fill="#f59e0b" fontSize={8}>0.35</text>
      )}
      {/* SEM curve */}
      <path d={pathD} fill="none" stroke={color} strokeWidth={2} />
      {/* Axes */}
      <line x1={PAD.left} x2={PAD.left + W} y1={PAD.top + H} y2={PAD.top + H} stroke="#475569" />
      <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + H} stroke="#475569" />
      {/* θ labels */}
      {[-3, -2, -1, 0, 1, 2, 3].filter((v) => v >= tMin && v <= tMax).map((v) => (
        <text key={v} x={tx(v)} y={PAD.top + H + 12} fill="#64748b" fontSize={8} textAnchor="middle">{v}</text>
      ))}
      {/* SEM axis labels */}
      {[0, 0.2, 0.4, 0.6].filter((v) => v <= sMax).map((v) => (
        <text key={v} x={PAD.left - 4} y={ty(v) + 3} fill="#64748b" fontSize={7} textAnchor="end">{v.toFixed(1)}</text>
      ))}
      {/* Label */}
      <text x={PAD.left + 4} y={PAD.top + 10} fill={color} fontSize={9} fontWeight="bold">{label}</text>
    </svg>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const ConditionalSEMPanel: React.FC = () => {
  const [data, setData] = useState<CSEMPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"overall" | "by-skill" | "sessions" | "by-n">("overall");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/psychometrics/conditional-sem")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity size={20} className="text-teal-400" />
            Conditional SEM
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Standard error of measurement as a function of θ — IRT Fisher information model
          </p>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg transition-colors">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && <div className="bg-red-900/40 border border-red-700 rounded-lg p-3 text-red-300 text-sm">{error}</div>}

      {data && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Sessions", value: data.sessions.length.toLocaleString(), color: "text-teal-400" },
            { label: "Precision OK (SEM≤0.35)", value: `${data.pctPrecisionOK.toFixed(1)}%`, color: data.pctPrecisionOK >= 90 ? "text-emerald-400" : data.pctPrecisionOK >= 75 ? "text-amber-400" : "text-red-400" },
            { label: "Mean SEM", value: data.meanSEM.toFixed(3), color: "text-slate-300" },
            { label: "Median SEM", value: data.medianSEM.toFixed(3), color: "text-slate-300" },
          ].map((k) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800 border border-slate-700 rounded-xl p-3">
              <p className="text-slate-400 text-xs mb-1">{k.label}</p>
              <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {(["overall", "by-skill", "sessions", "by-n"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-teal-700 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
            {t === "overall" ? "Overall Curve" : t === "by-skill" ? "By Skill" : t === "sessions" ? "Session SEMs" : "SEM vs N Items"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="load" className="flex justify-center py-16 text-slate-500 text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Computing SEM curves…
          </motion.div>
        ) : data && tab === "overall" ? (
          <motion.div key="overall" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-slate-300 mb-1">Overall SEM(θ) — All Items</h3>
            <p className="text-[10px] text-slate-500 mb-4">
              SEM(θ) = 1/√I(θ) where I(θ) = Σ items P′²/PQ. Dashed amber line = precision target (0.35).
            </p>
            <SEMCurveSVG points={data.overallCurve} color="#2dd4bf" label="All items" width={560} height={160} />
          </motion.div>
        ) : data && tab === "by-skill" ? (
          <motion.div key="by-skill" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-4">
            {data.byCurve.map((sk) => (
              <div key={sk.skill} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold" style={{ color: SKILL_COLORS[sk.skill] ?? "#94a3b8" }}>{sk.skill}</span>
                  <span className="text-slate-500 text-xs ml-auto">peak θ≈{sk.peakInfoTheta.toFixed(1)}, min SEM={sk.minSEM.toFixed(3)}</span>
                </div>
                <SEMCurveSVG points={sk.points} color={SKILL_COLORS[sk.skill] ?? "#94a3b8"} label={sk.skill} width={340} height={130} />
              </div>
            ))}
            {data.byCurve.length === 0 && (
              <div className="col-span-2 text-center py-8 text-slate-500">No skill-level SEM data.</div>
            )}
          </motion.div>
        ) : data && tab === "sessions" ? (
          <motion.div key="sessions" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-900">
                  <tr>
                    {["Session", "CEFR", "θ", "SEM", "N Items", "Precision"].map((h) => (
                      <th key={h} className="text-left text-slate-400 text-xs px-2 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.sessions.slice(0, 100).map((s) => (
                    <tr key={s.sessionId} className="border-t border-slate-700 hover:bg-slate-700/30">
                      <td className="px-2 py-1.5 text-slate-400 font-mono text-[10px]">{s.sessionId.slice(-10)}</td>
                      <td className="px-2 py-1.5">
                        <span className="px-1 py-0.5 rounded text-[10px] text-white font-semibold"
                          style={{ backgroundColor: CEFR_BG[s.cefrLevel] ?? "#475569" }}>
                          {s.cefrLevel.replace("_", "")}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-slate-300 font-mono text-xs">{s.theta.toFixed(2)}</td>
                      <td className={`px-2 py-1.5 font-mono text-xs font-semibold ${s.sem <= 0.35 ? "text-emerald-400" : s.sem <= 0.5 ? "text-amber-400" : "text-red-400"}`}>
                        {s.sem.toFixed(3)}
                      </td>
                      <td className="px-2 py-1.5 text-slate-500 text-xs">{s.nItems}</td>
                      <td className="px-2 py-1.5">
                        {s.precisionOK
                          ? <span className="flex items-center gap-1 text-[10px] text-emerald-400"><CheckCircle2 size={10} />OK</span>
                          : <span className="flex items-center gap-1 text-[10px] text-amber-400"><AlertTriangle size={10} />Low</span>
                        }
                      </td>
                    </tr>
                  ))}
                  {data.sessions.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-8 text-slate-500">No session data.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : data && tab === "by-n" ? (
          <motion.div key="by-n" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Mean SEM by Number of Items Administered</h3>
            <div className="space-y-3">
              {data.semByNItems.map((row) => (
                <div key={row.nItems} className="flex items-center gap-3">
                  <span className="text-slate-400 text-xs w-16">{row.nItems} items</span>
                  <div className="flex-1 h-4 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${Math.min(100, (row.meanSEM / 1.0) * 100)}%`,
                      backgroundColor: row.meanSEM <= 0.35 ? "#10b981" : row.meanSEM <= 0.5 ? "#f59e0b" : "#ef4444",
                    }} />
                  </div>
                  <span className={`text-xs font-mono font-semibold w-16 text-right ${row.meanSEM <= 0.35 ? "text-emerald-400" : row.meanSEM <= 0.5 ? "text-amber-400" : "text-red-400"}`}>
                    {row.meanSEM.toFixed(3)}
                  </span>
                </div>
              ))}
              {data.semByNItems.length === 0 && (
                <p className="text-slate-500 text-sm">No data.</p>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-4">Target: SEM ≤ 0.35 (shown in green). Typical CATs achieve this in 20–30 items.</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
