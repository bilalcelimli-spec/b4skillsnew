import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, Link2, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnchorItem {
  itemId: string;
  itemLabel: string;
  skill: string;
  cefrLevel: string;
  difficulty: number;
  discrimination: number;
  formAEstB: number;     // b-estimate in Form A
  formBEstB: number;     // b-estimate in Form B
  formAEstA: number;     // a-estimate in Form A
  formBEstA: number;     // a-estimate in Form B
  deltaB: number;        // formBEstB - formAEstB (raw shift)
  scaledB: number;       // after Stocking-Lord: formBEstB * slope + intercept
  residualB: number;     // scaledB - formAEstB
  driftFlag: boolean;    // |residualB| > 0.3
}

interface EquatingResult {
  method: "Stocking-Lord" | "Haebara";
  slope: number;
  intercept: number;
  rmse: number;           // root mean sq error of anchor residuals
  maxResidual: number;
  nAnchors: number;
}

interface FormComparison {
  formA: string;
  formB: string;
  nAnchorItems: number;
  stockingLord: EquatingResult;
  haebara: EquatingResult;
  anchors: AnchorItem[];
  residualDistribution: { bin: string; count: number }[];
  thetaShift: number;    // mean shift in theta after equating
  semShift: number;      // mean SEM change after equating
}

interface EquatingPayload {
  nForms: number;
  comparisons: FormComparison[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SKILL_COLORS: Record<string, string> = {
  GRAMMAR: "#6366f1", VOCABULARY: "#8b5cf6", READING: "#3b82f6",
  LISTENING: "#06b6d4", WRITING: "#10b981", SPEAKING: "#f59e0b",
};

function ResidualPlot({ anchors }: { anchors: AnchorItem[] }) {
  if (anchors.length < 3) return <div className="text-slate-500 text-xs text-center py-8">Insufficient anchor items</div>;
  const W = 380, H = 140, PAD = 36;
  const xVals = anchors.map((a) => a.difficulty);
  const yVals = anchors.map((a) => a.residualB);
  const xMin = Math.min(...xVals), xMax = Math.max(...xVals);
  const yMin = Math.min(...yVals, -0.4), yMax = Math.max(...yVals, 0.4);
  const xs = (v: number) => PAD + ((v - xMin) / Math.max(0.01, xMax - xMin)) * (W - PAD * 2);
  const ys = (v: number) => PAD + ((yMax - v) / Math.max(0.01, yMax - yMin)) * (H - PAD * 2);
  const zeroY = ys(0);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 140 }}>
      <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="#334155" strokeWidth={1} />
      <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="#334155" strokeWidth={1} />
      {/* zero line */}
      <line x1={PAD} y1={zeroY} x2={W - PAD} y2={zeroY} stroke="#64748b" strokeWidth={1} strokeDasharray="4 3" />
      {/* ±0.3 bands */}
      {[0.3, -0.3].map((v) => (
        <line key={v} x1={PAD} y1={ys(v)} x2={W - PAD} y2={ys(v)} stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 4" opacity={0.5} />
      ))}
      {anchors.map((a, i) => (
        <circle
          key={i}
          cx={xs(a.difficulty)}
          cy={ys(a.residualB)}
          r={3}
          fill={a.driftFlag ? "#ef4444" : "#6366f1"}
          opacity={0.8}
        >
          <title>{`${a.itemLabel}: residual=${a.residualB.toFixed(3)}`}</title>
        </circle>
      ))}
      <text x={W / 2} y={H - 4} fontSize={8} fill="#64748b" textAnchor="middle">b (difficulty)</text>
      <text x={8} y={H / 2} fontSize={8} fill="#64748b" textAnchor="middle" transform={`rotate(-90, 8, ${H / 2})`}>residual</text>
    </svg>
  );
}

function MethodCard({ result }: { result: EquatingResult }) {
  return (
    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
      <div className="text-sm font-medium text-white mb-3">{result.method}</div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div><div className="text-slate-500">Slope (A)</div><div className="text-white font-mono">{result.slope.toFixed(4)}</div></div>
        <div><div className="text-slate-500">Intercept (B)</div><div className="text-white font-mono">{result.intercept.toFixed(4)}</div></div>
        <div><div className="text-slate-500">RMSE</div>
          <div className="font-mono" style={{ color: result.rmse > 0.3 ? "#ef4444" : result.rmse > 0.15 ? "#f59e0b" : "#10b981" }}>
            {result.rmse.toFixed(4)}
          </div>
        </div>
        <div><div className="text-slate-500">Max |residual|</div>
          <div className="font-mono" style={{ color: result.maxResidual > 0.5 ? "#ef4444" : "#94a3b8" }}>
            {result.maxResidual.toFixed(4)}
          </div>
        </div>
        <div className="col-span-2"><div className="text-slate-500">Anchor items</div><div className="text-white font-mono">{result.nAnchors}</div></div>
      </div>
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

type EqTab = "summary" | "anchors" | "residuals" | "dist";

export function ScaleEquatingDiagnosticsPanel() {
  const [data, setData] = useState<EquatingPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EqTab>("summary");
  const [compIdx, setCompIdx] = useState(0);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch("/api/psychometrics/scale-equating");
      if (!r.ok) throw new Error(await r.text());
      const json: EquatingPayload = await r.json();
      setData(json);
      setCompIdx(0);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const comp = data?.comparisons?.[compIdx] ?? null;

  const kpis = comp ? [
    { label: "Anchor Items", value: comp.nAnchorItems, icon: <Link2 size={16} />, color: "#6366f1", fmt: String },
    { label: "SL RMSE", value: comp.stockingLord.rmse, icon: <TrendingUp size={16} />, color: comp.stockingLord.rmse > 0.3 ? "#ef4444" : "#10b981", fmt: (v: number) => v.toFixed(4) },
    { label: "Haebara RMSE", value: comp.haebara.rmse, icon: <CheckCircle2 size={16} />, color: comp.haebara.rmse > 0.3 ? "#ef4444" : "#10b981", fmt: (v: number) => v.toFixed(4) },
    { label: "Drift Items", value: comp.anchors.filter((a) => a.driftFlag).length, icon: <AlertTriangle size={16} />, color: comp.anchors.filter((a) => a.driftFlag).length > 0 ? "#ef4444" : "#10b981", fmt: String },
  ] : [];

  const TABS: { id: EqTab; label: string }[] = [
    { id: "summary", label: "Method Summary" },
    { id: "anchors", label: "Anchor Table" },
    { id: "residuals", label: "Residual Plot" },
    { id: "dist", label: "Residual Dist." },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Score Scale Equating Diagnostics</h2>
          <p className="text-slate-400 text-sm mt-1">
            Stocking–Lord &amp; Haebara IRT-OS equating · anchor-item drift detection · θ-scale comparability
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300 text-sm">{error}</div>}

      {/* Form selector */}
      {data && data.comparisons.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {data.comparisons.map((c, i) => (
            <button
              key={i}
              onClick={() => setCompIdx(i)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${compIdx === i ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
            >
              {c.formA} → {c.formB}
            </button>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-2 mb-2" style={{ color: k.color }}>{k.icon}<span className="text-xs text-slate-400">{k.label}</span></div>
            <div className="text-2xl font-bold text-white">{(k.fmt as (v: any) => string)(k.value as any)}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/40 rounded-lg p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === t.id ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* SUMMARY */}
        {activeTab === "summary" && (
          <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-slate-400"><RefreshCw size={24} className="animate-spin mx-auto mb-3" />Loading…</div>
            ) : comp ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MethodCard result={comp.stockingLord} />
                  <MethodCard result={comp.haebara} />
                </div>
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 text-xs">
                  <div className="text-slate-300 font-medium mb-3">Equating Impact on θ Scale</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-slate-500">Mean θ shift</div>
                      <div className="font-mono text-white">{comp.thetaShift.toFixed(4)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Mean SEM change</div>
                      <div className="font-mono text-white">{comp.semShift.toFixed(4)}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Preferred method</div>
                      <div className="font-medium text-indigo-400">
                        {comp.stockingLord.rmse <= comp.haebara.rmse ? "Stocking-Lord" : "Haebara"}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500">Drift items (|res|&gt;0.3)</div>
                      <div className="font-mono" style={{ color: comp.anchors.filter((a) => a.driftFlag).length > 0 ? "#ef4444" : "#10b981" }}>
                        {comp.anchors.filter((a) => a.driftFlag).length}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-slate-500">No equating data available.</div>
            )}
          </motion.div>
        )}

        {/* ANCHOR TABLE */}
        {activeTab === "anchors" && (
          <motion.div key="anchors" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {comp && (
              <div className="overflow-x-auto rounded-xl border border-slate-700/50">
                <table className="w-full text-xs text-slate-300">
                  <thead>
                    <tr className="bg-slate-800/80 text-slate-400">
                      <th className="px-3 py-2 text-left">Item</th>
                      <th className="px-3 py-2 text-left">Skill</th>
                      <th className="px-3 py-2 text-right">b (Form A)</th>
                      <th className="px-3 py-2 text-right">b (Form B raw)</th>
                      <th className="px-3 py-2 text-right">b (scaled)</th>
                      <th className="px-3 py-2 text-right">Residual</th>
                      <th className="px-3 py-2 text-center">Drift</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comp.anchors.sort((a, b) => Math.abs(b.residualB) - Math.abs(a.residualB)).map((a) => (
                      <tr key={a.itemId} className={`border-t border-slate-700/30 hover:bg-slate-800/40 ${a.driftFlag ? "bg-red-950/20" : ""}`}>
                        <td className="px-3 py-2 font-mono text-white">{a.itemLabel}</td>
                        <td className="px-3 py-2">
                          <span className="px-1.5 py-0.5 rounded text-xs font-medium text-white" style={{ background: SKILL_COLORS[a.skill] ?? "#6366f1" }}>
                            {a.skill.slice(0, 3)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{a.formAEstB.toFixed(3)}</td>
                        <td className="px-3 py-2 text-right font-mono">{a.formBEstB.toFixed(3)}</td>
                        <td className="px-3 py-2 text-right font-mono text-indigo-300">{a.scaledB.toFixed(3)}</td>
                        <td className="px-3 py-2 text-right font-mono" style={{ color: a.driftFlag ? "#ef4444" : Math.abs(a.residualB) > 0.15 ? "#f59e0b" : "#10b981" }}>
                          {a.residualB > 0 ? "+" : ""}{a.residualB.toFixed(3)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {a.driftFlag
                            ? <AlertTriangle size={12} className="inline text-red-400" />
                            : <CheckCircle2 size={12} className="inline text-emerald-400" />
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

        {/* RESIDUAL PLOT */}
        {activeTab === "residuals" && (
          <motion.div key="residuals" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <p className="text-slate-400 text-xs leading-relaxed">
              Residuals after Stocking–Lord equating plotted against item difficulty.
              Dashed amber lines at ±0.30. Systematic curvature or outliers indicate equating problems.
            </p>
            {comp && (
              <div className="bg-slate-900/50 rounded-xl border border-slate-700/50 p-3">
                <ResidualPlot anchors={comp.anchors} />
              </div>
            )}
          </motion.div>
        )}

        {/* RESIDUAL DISTRIBUTION */}
        {activeTab === "dist" && (
          <motion.div key="dist" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <p className="text-slate-400 text-xs">
              Distribution of Stocking–Lord equating residuals. Should be approximately normal with μ ≈ 0 and σ &lt; 0.2.
            </p>
            {comp && (() => {
              const max = Math.max(1, ...comp.residualDistribution.map((b) => b.count));
              return (
                <div className="space-y-1">
                  {comp.residualDistribution.map((b) => {
                    const r = parseFloat(b.bin);
                    const flag = Math.abs(r) >= 0.3;
                    return (
                      <div key={b.bin} className="flex items-center gap-2 text-xs">
                        <span className="w-14 text-right font-mono text-slate-400">{b.bin}</span>
                        <div className="flex-1 bg-slate-800 rounded-full h-4 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${(b.count / max) * 100}%`, background: flag ? "#ef4444" : "#6366f1" }}
                          />
                        </div>
                        <span className="w-8 text-slate-300">{b.count}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
