import React, { useEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import { RefreshCw, Sigma, Info } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TifPoint {
  theta: number;
  information: number;
  sem: number;
  cefrLevel: string;
}

interface SkillTif {
  skill: string;
  points: TifPoint[];
  peakTheta: number;
  peakInfo: number;
  minSem: number;
  itemCount: number;
}

interface TifPayload {
  overall: TifPoint[];
  bySkill: SkillTif[];
  skills: string[];
  cefrCuts: { level: string; theta: number }[];
  peakTheta: number;
  peakInfo: number;
  minSem: number;
  itemCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SKILL_LABELS: Record<string, string> = {
  GRAMMAR: "Grammar", VOCABULARY: "Vocabulary", READING: "Reading",
  LISTENING: "Listening", WRITING: "Writing", SPEAKING: "Speaking",
};

const SKILL_COLORS: Record<string, string> = {
  GRAMMAR: "#3b82f6", VOCABULARY: "#10b981", READING: "#f59e0b",
  LISTENING: "#8b5cf6", WRITING: "#ef4444", SPEAKING: "#f97316",
};

const CEFR_BAND_COLORS: Record<string, string> = {
  PRE_A1: "#334155", A1: "#1d4ed8", A2: "#0e7490", B1: "#065f46", B2: "#92400e", C1: "#9a3412", C2: "#7f1d1d",
};

function semGrade(sem: number): string {
  if (sem <= 0.25) return "text-emerald-400";
  if (sem <= 0.33) return "text-cyan-400";
  if (sem <= 0.45) return "text-amber-400";
  return "text-red-400";
}

// ─── SVG TIF Chart ────────────────────────────────────────────────────────────

const TifChart: React.FC<{
  points: TifPoint[];
  skillSeries: SkillTif[];
  cefrCuts: { level: string; theta: number }[];
  showSkills: boolean;
  highlightSkill: string | null;
}> = ({ points, skillSeries, cefrCuts, showSkills, highlightSkill }) => {
  const W = 620, H = 200, padL = 50, padR = 20, padT = 10, padB = 30;
  const thetas = points.map((p) => p.theta);
  const minT = -3.5, maxT = 3.5;
  const maxInfo = Math.max(...points.map((p) => p.information), ...skillSeries.flatMap((s) => s.points.map((p) => p.information)), 1) * 1.15;

  const xS = (t: number) => padL + ((t - minT) / (maxT - minT)) * (W - padL - padR);
  const yS = (v: number) => padT + (1 - v / maxInfo) * (H - padT - padB);

  const makePath = (pts: TifPoint[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${xS(p.theta).toFixed(1)} ${yS(p.information).toFixed(1)}`).join(" ");

  // Y-axis grid ticks
  const yTicks = [0, Math.round(maxInfo * 0.25), Math.round(maxInfo * 0.5), Math.round(maxInfo * 0.75), Math.round(maxInfo)];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* CEFR band shading */}
      {cefrCuts.map((cut, ci) => {
        const x1 = xS(cut.theta);
        const x2 = ci + 1 < cefrCuts.length ? xS(cefrCuts[ci + 1].theta) : W - padR;
        return (
          <rect
            key={cut.level}
            x={x1}
            y={padT}
            width={x2 - x1}
            height={H - padT - padB}
            fill={CEFR_BAND_COLORS[cut.level] ?? "#1e293b"}
            opacity={0.25}
          />
        );
      })}
      {/* CEFR cut lines */}
      {cefrCuts.map((cut) => (
        <g key={cut.level}>
          <line x1={xS(cut.theta)} y1={padT} x2={xS(cut.theta)} y2={H - padB} stroke="#475569" strokeWidth={1} strokeDasharray="4,2" />
          <text x={xS(cut.theta) + 2} y={padT + 9} fill="#94a3b8" fontSize={8}>{cut.level.replace("_", "")}</text>
        </g>
      ))}
      {/* Grid lines */}
      {yTicks.map((v) => (
        <g key={v}>
          <line x1={padL} y1={yS(v)} x2={W - padR} y2={yS(v)} stroke="#1e293b" strokeWidth={1} />
          <text x={padL - 4} y={yS(v) + 3} fill="#64748b" fontSize={8} textAnchor="end">{v}</text>
        </g>
      ))}
      {/* Skill TIF lines */}
      {showSkills && skillSeries.map((s) => {
        const fade = highlightSkill && highlightSkill !== s.skill;
        return (
          <path
            key={s.skill}
            d={makePath(s.points)}
            fill="none"
            stroke={SKILL_COLORS[s.skill] ?? "#94a3b8"}
            strokeWidth={fade ? 0.8 : 1.8}
            opacity={fade ? 0.25 : 0.75}
            strokeDasharray="4,2"
          />
        );
      })}
      {/* Overall TIF */}
      <path d={makePath(points)} fill="none" stroke="#e2e8f0" strokeWidth={2.5} />
      {/* Axes */}
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#475569" strokeWidth={1} />
      <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#475569" strokeWidth={1} />
      {/* X-axis labels */}
      {[-3, -2, -1, 0, 1, 2, 3].map((t) => (
        <text key={t} x={xS(t)} y={H - 5} fill="#94a3b8" fontSize={8} textAnchor="middle">{t}</text>
      ))}
      <text x={(W + padL) / 2} y={H} fill="#64748b" fontSize={9} textAnchor="middle">θ (Ability)</text>
      <text x={8} y={H / 2} fill="#64748b" fontSize={9} textAnchor="middle" transform={`rotate(-90, 8, ${H / 2})`}>I(θ)</text>
    </svg>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const TestInformationPanel: React.FC = () => {
  const [data, setData] = useState<TifPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSkills, setShowSkills] = useState(false);
  const [highlightSkill, setHighlightSkill] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/psychometrics/test-information")
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
            <Sigma size={20} className="text-violet-400" />
            Test Information Function (TIF)
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            I(θ) = Σ item information; SEM(θ) = 1/√I(θ). Shaded regions = CEFR bands.
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
            { label: "Active Items", value: data.itemCount.toLocaleString(), color: "text-violet-400" },
            { label: "Peak I(θ)", value: data.peakInfo.toFixed(1), color: "text-white" },
            { label: "Peak θ", value: data.peakTheta.toFixed(2), color: "text-slate-200" },
            {
              label: "Min SEM",
              value: data.minSem.toFixed(3),
              color: semGrade(data.minSem),
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

      {/* Chart controls */}
      {data && (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowSkills((v) => !v)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${showSkills ? "bg-violet-700 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
          >
            Per-skill TIF
          </button>
          {showSkills && data.bySkill.map((s) => (
            <button
              key={s.skill}
              onClick={() => setHighlightSkill((v) => v === s.skill ? null : s.skill)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${highlightSkill === s.skill ? "ring-2 ring-white/50" : "opacity-80"}`}
              style={{ backgroundColor: SKILL_COLORS[s.skill] + "50", color: SKILL_COLORS[s.skill] }}
            >
              {SKILL_LABELS[s.skill] ?? s.skill}
            </button>
          ))}
        </div>
      )}

      {/* TIF Chart */}
      {loading ? (
        <div className="flex justify-center py-16 text-slate-500 text-sm">Loading…</div>
      ) : data && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <TifChart
            points={data.overall}
            skillSeries={data.bySkill}
            cefrCuts={data.cefrCuts}
            showSkills={showSkills}
            highlightSkill={highlightSkill}
          />
        </div>
      )}

      {/* Per-skill summary table */}
      {data && data.bySkill.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-900">
              <tr>
                {["Skill", "Items", "Peak I(θ)", "Peak θ", "Min SEM"].map((h) => (
                  <th key={h} className="text-left text-slate-400 text-xs px-3 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.bySkill.map((s) => (
                <tr
                  key={s.skill}
                  className="border-t border-slate-700 hover:bg-slate-700/30 transition-colors cursor-pointer"
                  onMouseEnter={() => { setShowSkills(true); setHighlightSkill(s.skill); }}
                  onMouseLeave={() => setHighlightSkill(null)}
                >
                  <td className="px-3 py-2 font-semibold" style={{ color: SKILL_COLORS[s.skill] ?? "#94a3b8" }}>
                    {SKILL_LABELS[s.skill] ?? s.skill}
                  </td>
                  <td className="px-3 py-2 text-slate-300">{s.itemCount}</td>
                  <td className="px-3 py-2 text-slate-200 font-semibold">{s.peakInfo.toFixed(1)}</td>
                  <td className="px-3 py-2 text-slate-300">{s.peakTheta.toFixed(2)}</td>
                  <td className={`px-3 py-2 font-semibold ${semGrade(s.minSem)}`}>{s.minSem.toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reference box */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-slate-400 text-xs flex gap-2">
        <Info size={13} className="text-violet-400 flex-shrink-0 mt-0.5" />
        <span>
          <strong className="text-slate-300">3PL TIF formula:</strong> I(θ) = a²·(P−c)²·(1−P) / [P·(1−c)²].
          SEM = 1/√I(θ). Reliability ρ = 1 − σ²(SEM)/σ²(θ). CEFR boundaries: A1 = −2.5θ, A2 = −1.5θ, B1 = −0.5θ, B2 = 0.5θ, C1 = 1.5θ, C2 = 2.5θ.
          Reference: Lord (1980), Baker &amp; Kim (2004).
        </span>
      </div>
    </div>
  );
};
