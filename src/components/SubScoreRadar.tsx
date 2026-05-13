/**
 * SubScoreRadar
 *
 * Recharts RadarChart displaying rubric sub-scores for a WRITING or SPEAKING response.
 * Accepts `rubricScores` (grammar/vocabulary/coherence/taskRelevance/fluency) and optionally
 * `speakingFeatures` (pronunciationClarity/lexicalDiversity/grammaticalAccuracy/discourseStructure).
 *
 * All scores are expected on a 0–10 scale.
 */

import React from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { cn } from "@/src/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RubricScores {
  grammar?: number;
  vocabulary?: number;
  coherence?: number;
  taskRelevance?: number;
  fluency?: number;
}

export interface SpeakingFeatures {
  pronunciationClarity?: number;
  lexicalDiversity?: number;
  grammaticalAccuracy?: number;
  discourseStructure?: number;
  speechRate?: number;
  pauseDuration?: number;
}

interface Props {
  rubricScores?: RubricScores;
  speakingFeatures?: SpeakingFeatures;
  skill?: string;
  size?: "sm" | "md";
  className?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AXIS_LABELS: Record<string, string> = {
  grammar: "Dilbilgisi",
  vocabulary: "Sözvarlığı",
  coherence: "Tutarlılık",
  taskRelevance: "Görev",
  fluency: "Akıcılık",
  pronunciationClarity: "Telaffuz",
  lexicalDiversity: "Çeşitlilik",
  grammaticalAccuracy: "Doğruluk",
  discourseStructure: "Söylem",
};

function scoreColor(score: number): string {
  if (score >= 8) return "#10b981";
  if (score >= 6) return "#6366f1";
  if (score >= 4) return "#f59e0b";
  return "#f43f5e";
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      <div className="font-black text-slate-900">{d.label}</div>
      <div
        className="text-base font-black mt-0.5"
        style={{ color: scoreColor(d.value) }}
      >
        {d.value.toFixed(1)} / 10
      </div>
    </div>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const SubScoreRadar: React.FC<Props> = ({
  rubricScores,
  speakingFeatures,
  skill,
  size = "md",
  className,
}) => {
  if (!rubricScores && !speakingFeatures) return null;

  // Build chart data from rubricScores
  const rubricData = rubricScores
    ? Object.entries(rubricScores)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([key, value]) => ({
          key,
          label: AXIS_LABELS[key] ?? key,
          value: Number(value),
          fullMark: 10,
        }))
    : [];

  // For speaking, also show the detailed features chart
  const featureData = speakingFeatures
    ? (["pronunciationClarity", "lexicalDiversity", "grammaticalAccuracy", "discourseStructure"] as const)
        .filter((k) => speakingFeatures[k] !== undefined)
        .map((key) => ({
          key,
          label: AXIS_LABELS[key] ?? key,
          value: Number(speakingFeatures[key]),
          fullMark: 10,
        }))
    : [];

  const showFeatures = featureData.length >= 3;
  const chartH = size === "sm" ? 180 : 220;
  const isSpeak = skill === "SPEAKING";

  // Average score for color
  const allValues = [...rubricData, ...featureData].map((d) => d.value);
  const avg = allValues.length > 0 ? allValues.reduce((a, b) => a + b, 0) / allValues.length : 0;
  const accentColor = scoreColor(avg);

  return (
    <div className={cn("space-y-4", className)}>
      {/* ── Rubric score bars ─────────────────────────────────────── */}
      <div>
        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">
          Rubrik Alt-Skorlar
        </div>
        <div className="space-y-2.5">
          {rubricData.map(({ key, label, value }) => (
            <div key={key}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-slate-600">{label}</span>
                <span
                  className="text-[10px] font-black"
                  style={{ color: scoreColor(value) }}
                >
                  {value.toFixed(1)}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${(value / 10) * 100}%`, background: scoreColor(value) }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Radar chart ───────────────────────────────────────────── */}
      {rubricData.length >= 3 && (
        <div>
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
            Radar
          </div>
          <ResponsiveContainer width="100%" height={chartH}>
            <RadarChart data={rubricData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis
                dataKey="label"
                tick={{ fontSize: 9, fontWeight: 700, fill: "#94a3b8" }}
              />
              <Radar
                dataKey="value"
                stroke={accentColor}
                fill={accentColor}
                fillOpacity={0.18}
                strokeWidth={2}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Speaking features ─────────────────────────────────────── */}
      {showFeatures && (
        <div>
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">
            Konuşma Özellikleri
          </div>
          <div className="space-y-2.5">
            {featureData.map(({ key, label, value }) => (
              <div key={key}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-slate-600">{label}</span>
                  <span
                    className="text-[10px] font-black"
                    style={{ color: scoreColor(value) }}
                  >
                    {value.toFixed(1)}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(value / 10) * 100}%`, background: scoreColor(value) }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Speech rate + pause duration as badges */}
          {(speakingFeatures?.speechRate || speakingFeatures?.pauseDuration !== undefined) && (
            <div className="flex gap-3 mt-3">
              {speakingFeatures?.speechRate && (
                <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                  <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">Konuşma Hızı</div>
                  <div className="text-base font-black text-slate-800 mt-0.5">
                    {Math.round(speakingFeatures.speechRate)} <span className="text-[9px] font-medium text-slate-400">wpm</span>
                  </div>
                </div>
              )}
              {speakingFeatures?.pauseDuration !== undefined && (
                <div className="flex-1 bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                  <div className="text-[8px] font-black uppercase tracking-widest text-slate-400">Toplam Duraklama</div>
                  <div className="text-base font-black text-slate-800 mt-0.5">
                    {speakingFeatures.pauseDuration.toFixed(1)} <span className="text-[9px] font-medium text-slate-400">sn</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
