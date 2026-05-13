import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { Button } from "../ui/Button";
import { RefreshCw, TrendingUp, AlertTriangle, CheckCircle2, Activity } from "lucide-react";
import { cn } from "../../lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface AigFunnelStats {
  draft: number;
  review: number;
  pretest: number;
  active: number;
  retired: number;
  pretestSurvivalRate: number | null;
  calibrationSurvivalRate: number | null;
}

interface CefrAlignmentStats {
  n: number;
  pearsonR: number | null;
  mae: number | null;
  rmse: number | null;
  byLevel: Record<string, { n: number; predictedBMean: number; empiricalBMean: number; mae: number }>;
}

interface LargeDeviation {
  itemId: string;
  skill: string;
  cefrLevel: string;
  predictedB: number;
  empiricalB: number;
  deltaB: number;
  flagged: boolean;
}

interface AigQualityReport {
  funnel: AigFunnelStats;
  cefrAlignment: CefrAlignmentStats;
  largeDeviations: LargeDeviation[];
  generatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function pct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

function round2(v: number) {
  return v.toFixed(2);
}

// Simple bar drawn with divs — no external charting dependency
function HorizontalBar({
  value,
  max,
  colorClass,
  label,
}: {
  value: number;
  max: number;
  colorClass: string;
  label: string;
}) {
  const width = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-28 shrink-0 text-right text-slate-500">{label}</span>
      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", colorClass)} style={{ width: `${width}%` }} />
      </div>
      <span className="w-10 text-right font-mono text-slate-700">{value}</span>
    </div>
  );
}

// Mini scatter plot for CEFR alignment
function AlignmentScatter({ byLevel }: { byLevel: Record<string, { n: number; predictedBMean: number; empiricalBMean: number; mae: number }> }) {
  const points = Object.entries(byLevel).map(([cefrLevel, s]) => ({ cefrLevel, ...s }));
  if (points.length === 0) return null;

  const xs = points.map((p) => p.predictedBMean);
  const ys = points.map((p) => p.empiricalBMean);
  const allVals = [...xs, ...ys];
  const minVal = Math.min(...allVals) - 0.5;
  const maxVal = Math.max(...allVals) + 0.5;
  const range = maxVal - minVal;

  const W = 240;
  const H = 200;
  const PAD = 28;

  function toSvgX(v: number) {
    return PAD + ((v - minVal) / range) * (W - 2 * PAD);
  }
  function toSvgY(v: number) {
    return H - PAD - ((v - minVal) / range) * (H - 2 * PAD);
  }

  // y = x line
  const lineStart = { x: toSvgX(minVal), y: toSvgY(minVal) };
  const lineEnd = { x: toSvgX(maxVal), y: toSvgY(maxVal) };

  const CEFR_COLORS: Record<string, string> = {
    A1: "#34d399", A2: "#6ee7b7", B1: "#60a5fa", B2: "#818cf8", C1: "#f472b6", C2: "#fb923c",
  };

  return (
    <svg width={W} height={H} className="overflow-visible">
      {/* Axis lines */}
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#e2e8f0" strokeWidth={1} />
      <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#e2e8f0" strokeWidth={1} />
      {/* Identity line */}
      <line
        x1={lineStart.x} y1={lineStart.y}
        x2={lineEnd.x} y2={lineEnd.y}
        stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 3"
      />
      {/* Data points */}
      {points.map((p) => (
        <g key={p.cefrLevel}>
          <circle
            cx={toSvgX(p.predictedBMean)}
            cy={toSvgY(p.empiricalBMean)}
            r={Math.max(5, Math.min(14, Math.sqrt(p.n) * 1.5))}
            fill={CEFR_COLORS[p.cefrLevel] ?? "#94a3b8"}
            fillOpacity={0.75}
            stroke="white"
            strokeWidth={1.5}
          />
          <text
            x={toSvgX(p.predictedBMean)}
            y={toSvgY(p.empiricalBMean) - 9}
            textAnchor="middle"
            fontSize={9}
            fill="#475569"
          >
            {p.cefrLevel}
          </text>
        </g>
      ))}
      {/* Axis labels */}
      <text x={W / 2} y={H} textAnchor="middle" fontSize={9} fill="#94a3b8">Predicted b</text>
      <text
        x={10} y={H / 2}
        textAnchor="middle"
        fontSize={9}
        fill="#94a3b8"
        transform={`rotate(-90, 10, ${H / 2})`}
      >
        Empirical b
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function AigQualityPanel() {
  const [report, setReport] = useState<AigQualityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/aig/quality");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setReport(await res.json());
    } catch (e: any) {
      setError(e.message ?? "Failed to load AIG quality report");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on mount
  React.useEffect(() => { fetchReport(); }, [fetchReport]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">AIG Quality Metrics</h2>
          <p className="text-sm text-slate-500">AI-generated item survival funnel & CEFR difficulty alignment</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchReport} disabled={loading}>
          <RefreshCw size={14} className={cn("mr-1.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!report && !loading && !error && (
        <div className="text-center py-16 text-slate-400 text-sm">No data — click Refresh to load.</div>
      )}

      {loading && (
        <div className="text-center py-16 text-slate-400 text-sm animate-pulse">Loading report…</div>
      )}

      {report && (
        <>
          {/* KPI row */}
          {(() => {
            const totalGenerated = report.funnel.draft + report.funnel.review + report.funnel.pretest + report.funnel.active + report.funnel.retired;
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard
                  label="Total Generated"
                  value={totalGenerated.toString()}
                  icon={<Activity size={16} className="text-indigo-500" />}
                />
                <StatCard
                  label="Active Items"
                  value={report.funnel.active.toString()}
                  icon={<CheckCircle2 size={16} className="text-emerald-500" />}
                />
                <StatCard
                  label="Pretest→Calibrated"
                  value={report.funnel.pretestSurvivalRate != null ? pct(report.funnel.pretestSurvivalRate) : "—"}
                  icon={<TrendingUp size={16} className="text-blue-500" />}
                  sub="survival rate"
                />
                <StatCard
                  label="Calibrated→Active"
                  value={report.funnel.calibrationSurvivalRate != null ? pct(report.funnel.calibrationSurvivalRate) : "—"}
                  icon={<TrendingUp size={16} className="text-violet-500" />}
                  sub="survival rate"
                />
              </div>
            );
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Funnel chart */}
            <Card>
              <CardHeader className="pb-2">
                <span className="text-sm font-medium text-slate-700">Item Status Funnel</span>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {[
                  { label: "Draft", value: report.funnel.draft, color: "bg-slate-400" },
                  { label: "Review", value: report.funnel.review, color: "bg-amber-400" },
                  { label: "Pretest", value: report.funnel.pretest, color: "bg-blue-400" },
                  { label: "Active", value: report.funnel.active, color: "bg-emerald-500" },
                  { label: "Retired", value: report.funnel.retired, color: "bg-red-400" },
                ].map((row) => (
                  <HorizontalBar
                    key={row.label}
                    label={row.label}
                    value={row.value}
                    max={report.funnel.draft + report.funnel.review + report.funnel.pretest + report.funnel.active + report.funnel.retired}
                    colorClass={row.color}
                  />
                ))}
              </CardContent>
            </Card>

            {/* CEFR alignment */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">CEFR Difficulty Alignment</span>
                  <span className="text-xs text-slate-400">r = {report.cefrAlignment.pearsonR != null ? round2(report.cefrAlignment.pearsonR) : "—"}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6 items-start flex-wrap">
                  <AlignmentScatter byLevel={report.cefrAlignment.byLevel} />
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <MetricRow label="Pearson r" value={report.cefrAlignment.pearsonR != null ? round2(report.cefrAlignment.pearsonR) : "—"} good={(report.cefrAlignment.pearsonR ?? 0) >= 0.85} />
                    <MetricRow label="MAE (logits)" value={report.cefrAlignment.mae != null ? round2(report.cefrAlignment.mae) : "—"} good={(report.cefrAlignment.mae ?? 1) <= 0.5} invert />
                    <MetricRow label="RMSE (logits)" value={report.cefrAlignment.rmse != null ? round2(report.cefrAlignment.rmse) : "—"} good={(report.cefrAlignment.rmse ?? 1) <= 0.7} invert />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Per-level breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <span className="text-sm font-medium text-slate-700">Per-Level Alignment Detail</span>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {["Level", "Items", "Predicted b", "Empirical b", "Δb"].map((h) => (
                        <th key={h} className="text-left py-1.5 pr-4 text-slate-500 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(report.cefrAlignment.byLevel).map(([level, row]) => (
                      <tr key={level} className="border-b border-slate-50 hover:bg-slate-50">
                        <td className="py-1.5 pr-4 font-semibold text-slate-700">{level}</td>
                        <td className="py-1.5 pr-4 text-slate-500">{row.n}</td>
                        <td className="py-1.5 pr-4 font-mono">{round2(row.predictedBMean)}</td>
                        <td className="py-1.5 pr-4 font-mono">{round2(row.empiricalBMean)}</td>
                        <td className={cn("py-1.5 pr-4 font-mono", row.mae > 1 ? "text-red-600" : row.mae > 0.5 ? "text-amber-600" : "text-emerald-600")}>
                          {round2(row.mae)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Large deviations */}
          {report.largeDeviations.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <span className="text-sm font-medium text-slate-700">
                    Large Deviations ({report.largeDeviations.length} items with |Δb| &gt; 1.0 logit)
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100">
                        {["Item ID", "Level", "Predicted b", "Empirical b", "Δb"].map((h) => (
                          <th key={h} className="text-left py-1.5 pr-4 text-slate-500 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.largeDeviations.map((d) => (
                        <tr key={d.itemId} className="border-b border-slate-50 hover:bg-amber-50">
                          <td className="py-1.5 pr-4 font-mono text-slate-700">{d.itemId.slice(0, 12)}…</td>
                          <td className="py-1.5 pr-4">{d.cefrLevel}</td>
                          <td className="py-1.5 pr-4 font-mono">{round2(d.predictedB)}</td>
                          <td className="py-1.5 pr-4 font-mono">{round2(d.empiricalB)}</td>
                          <td className="py-1.5 pr-4 font-mono text-red-600 font-semibold">
                            {d.deltaB >= 0 ? "+" : ""}{round2(d.deltaB)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          <p className="text-xs text-slate-400 text-right">
            Generated at {new Date(report.generatedAt).toLocaleString()}
          </p>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SMALL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-xs text-slate-500">{label}</span>
        </div>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
        {sub && <div className="text-xs text-slate-400">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function MetricRow({
  label,
  value,
  good,
  invert = false,
}: {
  label: string;
  value: string;
  good: boolean;
  invert?: boolean;
}) {
  const isGood = invert ? !good : good;
  return (
    <div className="flex items-center gap-2">
      <span className={cn("w-2 h-2 rounded-full shrink-0", isGood ? "bg-emerald-400" : "bg-amber-400")} />
      <span className="text-slate-500">{label}:</span>
      <span className="font-mono font-medium text-slate-700">{value}</span>
    </div>
  );
}
