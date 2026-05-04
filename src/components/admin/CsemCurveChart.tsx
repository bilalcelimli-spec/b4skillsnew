/**
 * CsemCurveChart — Conditional Standard Error of Measurement visualisation
 *
 * Renders an SVG line chart of mean SEM binned across the θ scale,
 * with CEFR cut-score vertical lines and a reliability band overlay.
 */
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { Button } from "../ui/Button";
import { RefreshCw } from "lucide-react";
import { cn } from "../../lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CsemPoint {
  theta: number;
  meanSem: number;
  n: number;
}

interface CsemCurveData {
  sampleSize: number;
  thetaRange: [number, number];
  cefrCuts: Record<string, number>;
  points: CsemPoint[];
  message?: string;
}

// ─── CEFR level colours ───────────────────────────────────────────────────────

const CEFR_COLORS: Record<string, string> = {
  A1: "#6ee7b7",
  A2: "#34d399",
  B1: "#60a5fa",
  B2: "#818cf8",
  C1: "#c084fc",
  C2: "#f472b6",
};

// ─── SVG chart ────────────────────────────────────────────────────────────────

const CHART_W = 600;
const CHART_H = 220;
const PAD = { top: 18, right: 24, bottom: 36, left: 48 };
const INNER_W = CHART_W - PAD.left - PAD.right;
const INNER_H = CHART_H - PAD.top - PAD.bottom;

function toX(theta: number, minT: number, maxT: number): number {
  return PAD.left + ((theta - minT) / (maxT - minT)) * INNER_W;
}

function toY(sem: number, maxSem: number): number {
  return PAD.top + INNER_H - (sem / maxSem) * INNER_H;
}

interface ChartProps {
  data: CsemCurveData;
}

function SvgChart({ data }: ChartProps) {
  const { points, cefrCuts, thetaRange } = data;
  if (points.length < 2) return <p className="text-slate-400 text-xs text-center py-8">Not enough data to render curve.</p>;

  const [minT, maxT] = thetaRange;
  const maxSem = Math.max(...points.map((p) => p.meanSem)) * 1.15;

  // Build polyline
  const polyline = points
    .map((p) => `${toX(p.theta, minT, maxT).toFixed(1)},${toY(p.meanSem, maxSem).toFixed(1)}`)
    .join(" ");

  // Y axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1.0].filter((v) => v <= maxSem + 0.05);

  // X axis ticks — roughly every 1 unit
  const xTickStep = 1;
  const xTicks: number[] = [];
  for (let t = Math.ceil(minT); t <= Math.floor(maxT); t += xTickStep) xTicks.push(t);

  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full h-auto" role="img" aria-label="CSEM curve">
      {/* Y-axis grid + labels */}
      {yTicks.map((v) => {
        const y = toY(v, maxSem);
        return (
          <g key={v}>
            <line x1={PAD.left} y1={y} x2={CHART_W - PAD.right} y2={y} stroke="#e2e8f0" strokeWidth={0.5} />
            <text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize={9} fill="#94a3b8">{v.toFixed(2)}</text>
          </g>
        );
      })}

      {/* X-axis ticks */}
      {xTicks.map((t) => {
        const x = toX(t, minT, maxT);
        return (
          <g key={t}>
            <line x1={x} y1={PAD.top + INNER_H} x2={x} y2={PAD.top + INNER_H + 4} stroke="#94a3b8" strokeWidth={0.5} />
            <text x={x} y={PAD.top + INNER_H + 14} textAnchor="middle" fontSize={9} fill="#94a3b8">{t}</text>
          </g>
        );
      })}

      {/* Axes */}
      <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + INNER_H} stroke="#cbd5e1" strokeWidth={1} />
      <line x1={PAD.left} y1={PAD.top + INNER_H} x2={CHART_W - PAD.right} y2={PAD.top + INNER_H} stroke="#cbd5e1" strokeWidth={1} />

      {/* CEFR cut-score verticals */}
      {Object.entries(cefrCuts).map(([level, cut]) => {
        if (cut < minT || cut > maxT) return null;
        const x = toX(cut, minT, maxT);
        const color = CEFR_COLORS[level] ?? "#94a3b8";
        return (
          <g key={level}>
            <line x1={x} y1={PAD.top} x2={x} y2={PAD.top + INNER_H} stroke={color} strokeWidth={1.2} strokeDasharray="4 2" />
            <text x={x + 2} y={PAD.top + 10} fontSize={8} fill={color} fontWeight={600}>{level}</text>
          </g>
        );
      })}

      {/* CSEM fill */}
      <polyline
        points={[
          `${toX(points[0].theta, minT, maxT).toFixed(1)},${(PAD.top + INNER_H).toFixed(1)}`,
          polyline,
          `${toX(points[points.length - 1].theta, minT, maxT).toFixed(1)},${(PAD.top + INNER_H).toFixed(1)}`,
        ].join(" ")}
        fill="rgba(99,102,241,0.08)"
        stroke="none"
      />

      {/* CSEM line */}
      <polyline points={polyline} fill="none" stroke="#6366f1" strokeWidth={2} strokeLinejoin="round" />

      {/* Axis labels */}
      <text
        x={PAD.left + INNER_W / 2}
        y={CHART_H - 2}
        textAnchor="middle"
        fontSize={10}
        fill="#64748b"
      >
        θ (Ability Estimate)
      </text>
      <text
        x={10}
        y={PAD.top + INNER_H / 2}
        textAnchor="middle"
        fontSize={10}
        fill="#64748b"
        transform={`rotate(-90 10 ${PAD.top + INNER_H / 2})`}
      >
        SEM
      </text>
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CsemCurveChart() {
  const [data, setData] = useState<CsemCurveData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/psychometrics/csem-curve?steps=60");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const hasData = data && !data.message && data.points.length > 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Conditional SEM Curve</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Mean SEM per θ bin — lower is better. Vertical lines = CEFR cut scores.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw size={13} className={cn(loading && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">{error}</div>
        )}
        {loading && (
          <div className="text-center py-10 text-slate-400 text-xs animate-pulse">Loading…</div>
        )}
        {!loading && data?.message && (
          <div className="text-center py-10 text-slate-400 text-xs">{data.message}</div>
        )}
        {!loading && hasData && (
          <>
            <SvgChart data={data!} />
            <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-400">
              <span>n = {data!.sampleSize.toLocaleString()} sessions</span>
              <span>θ range [{data!.thetaRange[0].toFixed(2)}, {data!.thetaRange[1].toFixed(2)}]</span>
              <div className="flex gap-2 flex-wrap ml-auto">
                {Object.entries(data!.cefrCuts).map(([level]) => (
                  <span key={level} className="flex items-center gap-1">
                    <span
                      className="inline-block w-3 h-0.5 rounded"
                      style={{ background: CEFR_COLORS[level] ?? "#94a3b8" }}
                    />
                    {level}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
