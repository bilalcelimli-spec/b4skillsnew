import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, TrendingUp, Activity } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TCCPoint {
  theta: number;
  expectedScore: number;   // Σ P(θ) over items
  maxScore: number;        // n items
  proportionCorrect: number;  // expectedScore / maxScore
}

interface SkillTCC {
  skill: string;
  nItems: number;
  points: TCCPoint[];
  cefrCutpoints: { cefrLevel: string; theta: number; expectedScore: number }[];
}

interface TCCPayload {
  thetaGrid: number[];
  overall: TCCPoint[];
  overallMaxScore: number;
  bySkill: SkillTCC[];
  cefrCutpoints: { cefrLevel: string; theta: number }[];
  itemCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SKILL_COLORS: Record<string, string> = {
  GRAMMAR: "#3b82f6", VOCABULARY: "#10b981", READING: "#f59e0b",
  LISTENING: "#8b5cf6", WRITING: "#ef4444", SPEAKING: "#f97316",
};
const CEFR_COLORS: Record<string, string> = {
  PRE_A1: "#64748b", A1: "#3b82f6", A2: "#06b6d4",
  B1: "#10b981", B2: "#f59e0b", C1: "#f97316", C2: "#ef4444",
};

// ─── SVG TCC Chart ────────────────────────────────────────────────────────────

const TCCChart: React.FC<{
  points: TCCPoint[];
  maxScore: number;
  cefrCuts?: { cefrLevel: string; theta: number; expectedScore?: number }[];
  color: string;
  label: string;
  width?: number;
  height?: number;
}> = ({ points, maxScore, cefrCuts = [], color, label, width = 520, height = 160 }) => {
  if (points.length === 0) return <div className="text-slate-500 text-xs">No data</div>;

  const PAD = { top: 12, right: 20, bottom: 28, left: 40 };
  const W = width - PAD.left - PAD.right;
  const H = height - PAD.top - PAD.bottom;

  const thetas = points.map((p) => p.theta);
  const tMin = Math.min(...thetas), tMax = Math.max(...thetas);
  const scoreMax = maxScore;

  const tx = (t: number) => PAD.left + ((t - tMin) / (tMax - tMin || 1)) * W;
  const ty = (s: number) => PAD.top + H - (s / (scoreMax || 1)) * H;

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${tx(p.theta).toFixed(1)},${ty(p.expectedScore).toFixed(1)}`).join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1.0].map((pct) => {
        const y = ty(pct * scoreMax);
        return (
          <line key={pct} x1={PAD.left} x2={PAD.left + W} y1={y} y2={y}
            stroke="#334155" strokeWidth={1} strokeDasharray="3,3" />
        );
      })}
      {/* CEFR cut vertical lines */}
      {cefrCuts.map((cut) => {
        const x = tx(cut.theta);
        if (x < PAD.left || x > PAD.left + W) return null;
        return (
          <g key={cut.cefrLevel}>
            <line x1={x} x2={x} y1={PAD.top} y2={PAD.top + H}
              stroke={CEFR_COLORS[cut.cefrLevel] ?? "#94a3b8"} strokeWidth={1} strokeDasharray="4,2" />
            <text x={x + 2} y={PAD.top + 8} fill={CEFR_COLORS[cut.cefrLevel] ?? "#94a3b8"} fontSize={7}>
              {cut.cefrLevel.replace("_", "")}
            </text>
          </g>
        );
      })}
      {/* TCC curve */}
      <path d={pathD} fill="none" stroke={color} strokeWidth={2.5} />
      {/* Axes */}
      <line x1={PAD.left} x2={PAD.left + W} y1={PAD.top + H} y2={PAD.top + H} stroke="#475569" />
      <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + H} stroke="#475569" />
      {/* θ labels */}
      {[-3, -2, -1, 0, 1, 2, 3].filter((v) => v >= tMin && v <= tMax).map((v) => (
        <text key={v} x={tx(v)} y={PAD.top + H + 12} fill="#64748b" fontSize={8} textAnchor="middle">{v}</text>
      ))}
      {/* Score axis labels */}
      {[0, 0.25, 0.5, 0.75, 1.0].map((pct) => {
        const v = pct * scoreMax;
        return (
          <text key={pct} x={PAD.left - 4} y={ty(v) + 3} fill="#64748b" fontSize={7} textAnchor="end">
            {v.toFixed(0)}
          </text>
        );
      })}
      {/* Axis labels */}
      <text x={PAD.left + W / 2} y={height - 2} fill="#64748b" fontSize={8} textAnchor="middle">θ</text>
      <text x={8} y={PAD.top + H / 2} fill="#64748b" fontSize={8} textAnchor="middle"
        transform={`rotate(-90, 8, ${PAD.top + H / 2})`}>Expected Score</text>
      {/* Curve label */}
      <text x={PAD.left + W - 4} y={PAD.top + 10} fill={color} fontSize={9} fontWeight="bold" textAnchor="end">{label}</text>
    </svg>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const TestCharacteristicCurvePanel: React.FC = () => {
  const [data, setData] = useState<TCCPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"overall" | "by-skill" | "cutpoints">("overall");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/psychometrics/tcc")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp size={20} className="text-cyan-400" />
            Test Characteristic Curve (TCC)
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Expected test score as a function of θ — IRT true-score equating reference
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
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Items", value: data.itemCount.toLocaleString(), color: "text-cyan-400" },
            { label: "Max Score", value: data.overallMaxScore.toString(), color: "text-blue-400" },
            { label: "Skills", value: data.bySkill.length.toString(), color: "text-slate-300" },
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
        {(["overall", "by-skill", "cutpoints"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-cyan-700 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
            {t === "overall" ? "Overall TCC" : t === "by-skill" ? "By Skill" : "CEFR Cutpoints"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="load" className="flex justify-center py-16 text-slate-500 text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Computing test characteristic curves…
          </motion.div>
        ) : data && tab === "overall" ? (
          <motion.div key="overall" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-slate-300 mb-1">Overall TCC — All Active Items</h3>
            <p className="text-[10px] text-slate-500 mb-4">
              TCC(θ) = Σᵢ P(θ|aᵢ,bᵢ,cᵢ). Vertical dashed lines = CEFR θ cut-points. Used for true-score IRT equating.
            </p>
            <TCCChart
              points={data.overall}
              maxScore={data.overallMaxScore}
              cefrCuts={data.cefrCutpoints}
              color="#22d3ee"
              label="All items"
              width={580}
              height={180}
            />
          </motion.div>
        ) : data && tab === "by-skill" ? (
          <motion.div key="by-skill" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 gap-4">
            {data.bySkill.map((sk) => (
              <div key={sk.skill} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold" style={{ color: SKILL_COLORS[sk.skill] ?? "#94a3b8" }}>{sk.skill}</span>
                  <span className="text-slate-500 text-xs ml-auto">{sk.nItems} items</span>
                </div>
                <TCCChart
                  points={sk.points}
                  maxScore={sk.nItems}
                  cefrCuts={sk.cefrCutpoints}
                  color={SKILL_COLORS[sk.skill] ?? "#94a3b8"}
                  label={sk.skill}
                  width={340}
                  height={130}
                />
              </div>
            ))}
            {data.bySkill.length === 0 && (
              <div className="col-span-2 text-center py-8 text-slate-500">No skill-level data.</div>
            )}
          </motion.div>
        ) : data && tab === "cutpoints" ? (
          <motion.div key="cutpoints" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">CEFR Cut-point → Expected Score Mapping</h3>
            <p className="text-[11px] text-slate-500 mb-4">
              At each CEFR θ boundary, the TCC maps to an expected raw score — used for true-score equating across test forms.
            </p>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="text-left text-slate-400 text-xs px-3 py-2">CEFR Level</th>
                    <th className="text-left text-slate-400 text-xs px-3 py-2">θ Cut-point</th>
                    {data.bySkill.map((sk) => (
                      <th key={sk.skill} className="text-left text-[10px] px-3 py-2" style={{ color: SKILL_COLORS[sk.skill] ?? "#94a3b8" }}>
                        {sk.skill.slice(0, 4)} (/{sk.nItems})
                      </th>
                    ))}
                    <th className="text-left text-slate-400 text-xs px-3 py-2">Overall (/{data.overallMaxScore})</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cefrCutpoints.map((cut) => {
                    const overallPt = data.overall.reduce((best, p) => Math.abs(p.theta - cut.theta) < Math.abs(best.theta - cut.theta) ? p : best, data.overall[0]);
                    return (
                      <tr key={cut.cefrLevel} className="border-t border-slate-700">
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded text-[11px] text-white font-semibold"
                            style={{ backgroundColor: CEFR_COLORS[cut.cefrLevel] ?? "#475569" }}>
                            {cut.cefrLevel.replace("_", "")}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-300 font-mono text-xs">{cut.theta.toFixed(2)}</td>
                        {data.bySkill.map((sk) => {
                          const closest = sk.points.reduce((best, p) => Math.abs(p.theta - cut.theta) < Math.abs(best.theta - cut.theta) ? p : best, sk.points[0]);
                          return (
                            <td key={sk.skill} className="px-3 py-2 text-slate-400 text-xs">
                              {closest ? closest.expectedScore.toFixed(1) : "—"}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-slate-300 text-xs font-semibold">
                          {overallPt ? overallPt.expectedScore.toFixed(1) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
