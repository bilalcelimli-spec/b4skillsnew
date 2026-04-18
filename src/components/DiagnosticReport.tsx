import { useState, useMemo } from "react";
import { SkillType } from "../lib/assessment-engine/types";

interface SkillResult {
  skill: SkillType;
  theta: number;
  sem: number;
  cefrLevel: string;
  itemCount: number;
  correctCount: number;
}

interface DiagnosticData {
  overallTheta: number;
  overallSem: number;
  overallCefr: string;
  scaledScore: number;
  skills: SkillResult[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  testInfo: { theta: number; info: number }[];
}

interface Props {
  data: DiagnosticData;
  candidateName?: string;
}

const CEFR_COLORS: Record<string, string> = {
  "A1": "#ef4444", "A2": "#f97316", "B1": "#eab308",
  "B2": "#22c55e", "C1": "#3b82f6", "C2": "#8b5cf6",
};

const SKILL_LABELS: Record<string, string> = {
  [SkillType.READING]: "Reading",
  [SkillType.LISTENING]: "Listening",
  [SkillType.WRITING]: "Writing",
  [SkillType.SPEAKING]: "Speaking",
  [SkillType.GRAMMAR]: "Grammar",
  [SkillType.VOCABULARY]: "Vocabulary",
};

export default function DiagnosticReport({ data, candidateName }: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "skills" | "recommendations">("overview");

  const radarPoints = useMemo(() => {
    const skills = data.skills;
    const n = skills.length;
    const angleStep = (2 * Math.PI) / n;
    const cx = 150, cy = 150, r = 120;

    return skills.map((s, i) => {
      const angle = i * angleStep - Math.PI / 2;
      // Normalize theta from [-3, 3] to [0, 1]
      const normalized = Math.max(0, Math.min(1, (s.theta + 3) / 6));
      const x = cx + r * normalized * Math.cos(angle);
      const y = cy + r * normalized * Math.sin(angle);
      return { x, y, skill: s.skill, label: SKILL_LABELS[s.skill] || s.skill, normalized };
    });
  }, [data.skills]);

  const radarPath = radarPoints.map((p, i) =>
    `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`
  ).join(" ") + " Z";

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Diagnostic Report</h1>
        {candidateName && <p className="text-gray-500 mt-1">{candidateName}</p>}
        <div className="mt-4 inline-flex items-center gap-4">
          <span
            className="text-4xl font-bold px-6 py-2 rounded-lg text-white"
            style={{ backgroundColor: CEFR_COLORS[data.overallCefr] || "#6b7280" }}
          >
            {data.overallCefr}
          </span>
          <div className="text-left">
            <div className="text-sm text-gray-500">Scaled Score</div>
            <div className="text-2xl font-semibold">{data.scaledScore}</div>
          </div>
          <div className="text-left">
            <div className="text-sm text-gray-500">Precision (SEM)</div>
            <div className="text-2xl font-semibold">±{data.overallSem.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-6">
        {(["overview", "skills", "recommendations"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium capitalize ${
              activeTab === tab
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Radar Chart */}
          <div className="flex justify-center">
            <svg width="300" height="300" viewBox="0 0 300 300">
              {/* Grid circles */}
              {[0.25, 0.5, 0.75, 1].map(scale => (
                <circle
                  key={scale}
                  cx="150" cy="150"
                  r={120 * scale}
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
              ))}
              {/* Radar area */}
              <path d={radarPath} fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth="2" />
              {/* Points & labels */}
              {radarPoints.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="4" fill="#3b82f6" />
                  <text
                    x={150 + 140 * Math.cos(i * (2 * Math.PI / radarPoints.length) - Math.PI / 2)}
                    y={150 + 140 * Math.sin(i * (2 * Math.PI / radarPoints.length) - Math.PI / 2)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs fill-gray-600"
                    fontSize="11"
                  >
                    {p.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* Skill bars */}
          <div className="space-y-3">
            {data.skills.map(s => (
              <div key={s.skill} className="flex items-center gap-3">
                <div className="w-24 text-sm font-medium text-gray-700">
                  {SKILL_LABELS[s.skill] || s.skill}
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(5, Math.min(100, ((s.theta + 3) / 6) * 100))}%`,
                      backgroundColor: CEFR_COLORS[s.cefrLevel] || "#6b7280",
                    }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                    {s.cefrLevel} (θ={s.theta.toFixed(2)})
                  </span>
                </div>
                <div className="w-16 text-xs text-gray-500">
                  {s.correctCount}/{s.itemCount}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills Tab */}
      {activeTab === "skills" && (
        <div className="space-y-4">
          {/* Strengths */}
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">✓ Strengths</h3>
            <ul className="list-disc list-inside space-y-1 text-green-700 text-sm">
              {data.strengths.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>

          {/* Weaknesses */}
          <div className="p-4 bg-amber-50 rounded-lg">
            <h3 className="font-semibold text-amber-800 mb-2">△ Areas for Improvement</h3>
            <ul className="list-disc list-inside space-y-1 text-amber-700 text-sm">
              {data.weaknesses.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>

          {/* Test Information Curve (simplified bar chart) */}
          {data.testInfo.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Test Information Function</h3>
              <div className="flex items-end gap-1 h-32">
                {data.testInfo.map((pt, i) => {
                  const maxInfo = Math.max(...data.testInfo.map(p => p.info));
                  const height = maxInfo > 0 ? (pt.info / maxInfo) * 100 : 0;
                  const isNearTheta = Math.abs(pt.theta - data.overallTheta) < 0.5;
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-t"
                      style={{
                        height: `${height}%`,
                        backgroundColor: isNearTheta ? "#3b82f6" : "#d1d5db",
                      }}
                      title={`θ=${pt.theta}, I=${pt.info.toFixed(2)}`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>θ = -4</span>
                <span>θ = 0</span>
                <span>θ = 4</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommendations Tab */}
      {activeTab === "recommendations" && (
        <div className="space-y-3">
          {data.recommendations.map((rec, i) => (
            <div key={i} className="p-4 bg-blue-50 rounded-lg flex gap-3">
              <span className="text-blue-600 font-bold">{i + 1}.</span>
              <p className="text-blue-800 text-sm">{rec}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
