import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, LayoutDashboard, ArrowRight, CheckCircle2, BarChart3 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type RouteKey = "low" | "mid" | "high" | "unknown";

interface RouteStat {
  route: RouteKey;
  count: number;
  pct: number;
  meanTheta: number;
  meanSEM: number;
  meanItems: number;
  cefrDistribution: { cefrLevel: string; count: number }[];
}

interface ModuleFlow {
  fromModule: number;
  toRoute: RouteKey;
  count: number;
}

interface StageTheta {
  stage: number;
  meanTheta: number;
  sdTheta: number;
  n: number;
}

interface MSTPayload {
  totalSessions: number;
  mstEnabledSessions: number;
  routeStats: RouteStat[];
  moduleFlows: ModuleFlow[];
  stageTheta: StageTheta[];
  meanModules: number;
  meanItemsPerSession: number;
  completionRate: number;
  routingThresholds: { lowMax: number; midMax: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROUTE_COLORS: Record<RouteKey, string> = {
  low: "#3b82f6",
  mid: "#10b981",
  high: "#f59e0b",
  unknown: "#475569",
};
const ROUTE_BG: Record<RouteKey, string> = {
  low: "bg-blue-900/60 text-blue-300",
  mid: "bg-emerald-900/60 text-emerald-300",
  high: "bg-amber-900/60 text-amber-300",
  unknown: "bg-slate-700 text-slate-400",
};
const CEFR_BG: Record<string, string> = {
  PRE_A1: "#475569", A1: "#3b82f6", A2: "#06b6d4",
  B1: "#10b981", B2: "#f59e0b", C1: "#f97316", C2: "#ef4444",
};

function routeBadge(route: RouteKey) {
  const labels: Record<RouteKey, string> = { low: "Low", mid: "Mid", high: "High", unknown: "Unknown" };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${ROUTE_BG[route]}`}>
      {labels[route]}
    </span>
  );
}

// ─── Sankey-like flow diagram ─────────────────────────────────────────────────

const RouteFlowDiagram: React.FC<{ routeStats: RouteStat[]; total: number }> = ({ routeStats, total }) => {
  return (
    <div className="bg-slate-900 rounded-xl p-5">
      <h3 className="text-xs font-semibold text-slate-300 mb-4">MST Routing Flow</h3>
      <div className="flex items-center justify-between gap-4">
        {/* Module 0 node */}
        <div className="flex flex-col items-center">
          <div className="w-20 h-16 bg-slate-700 rounded-xl flex flex-col items-center justify-center border border-slate-600">
            <span className="text-slate-300 text-xs font-semibold">Module 0</span>
            <span className="text-slate-400 text-[10px]">{total} sessions</span>
          </div>
        </div>

        {/* Arrow + routing thresholds */}
        <div className="flex flex-col items-center gap-1">
          <ArrowRight size={20} className="text-slate-500" />
          <span className="text-slate-500 text-[9px]">θ routing</span>
        </div>

        {/* Route nodes */}
        <div className="flex flex-col gap-3">
          {(["high", "mid", "low"] as RouteKey[]).map((route) => {
            const stat = routeStats.find((s) => s.route === route);
            if (!stat) return null;
            const pct = total > 0 ? (stat.count / total) * 100 : 0;
            const barH = Math.max(20, (pct / 100) * 80);
            return (
              <div key={route} className="flex items-center gap-3">
                <div
                  className="rounded-lg flex flex-col items-center justify-center px-3"
                  style={{ backgroundColor: ROUTE_COLORS[route] + "33", border: `1px solid ${ROUTE_COLORS[route]}55`, height: `${barH}px`, minWidth: "100px" }}
                >
                  <span className="text-white text-xs font-semibold capitalize">{route} track</span>
                  <span className="text-white/60 text-[10px]">{stat.count} ({pct.toFixed(0)}%)</span>
                </div>
                <div className="text-slate-400 text-xs">
                  <div>θ̄ = {stat.meanTheta.toFixed(2)}</div>
                  <div>SEM = {stat.meanSEM.toFixed(2)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Theta convergence chart ──────────────────────────────────────────────────

const ThetaByStage: React.FC<{ stages: StageTheta[] }> = ({ stages }) => {
  if (!stages.length) return null;
  const allMeans = stages.map((s) => s.meanTheta);
  const minT = Math.min(...allMeans) - 0.5;
  const maxT = Math.max(...allMeans) + 0.5;
  const range = maxT - minT || 1;
  const H = 120;
  const W = Math.max(200, stages.length * 60);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 40}`} className="overflow-visible">
      {stages.map((s, i) => {
        const x = (i / Math.max(1, stages.length - 1)) * (W - 40) + 20;
        const y = H - ((s.meanTheta - minT) / range) * H;
        const sd = s.sdTheta;
        const yUp = H - ((s.meanTheta + sd - minT) / range) * H;
        const yDown = H - ((s.meanTheta - sd - minT) / range) * H;
        return (
          <g key={s.stage}>
            <line x1={x} y1={yDown} x2={x} y2={yUp} stroke="#475569" strokeWidth={1} />
            <circle cx={x} cy={y} r={4} fill="#14b8a6" />
            <text x={x} y={H + 20} textAnchor="middle" fill="#94a3b8" fontSize={10}>S{s.stage}</text>
            <text x={x} y={y - 8} textAnchor="middle" fill="#e2e8f0" fontSize={9}>{s.meanTheta.toFixed(2)}</text>
          </g>
        );
      })}
      {stages.length > 1 &&
        stages.slice(0, -1).map((s, i) => {
          const x1 = (i / Math.max(1, stages.length - 1)) * (W - 40) + 20;
          const x2 = ((i + 1) / Math.max(1, stages.length - 1)) * (W - 40) + 20;
          const y1 = H - ((s.meanTheta - minT) / range) * H;
          const y2 = H - ((stages[i + 1].meanTheta - minT) / range) * H;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#14b8a6" strokeWidth={1.5} strokeDasharray="4 2" />;
        })}
    </svg>
  );
};

// ─── Component ────────────────────────────────────────────────────────────────

export const MSTRoutingPanel: React.FC = () => {
  const [data, setData] = useState<MSTPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"flow" | "routes" | "convergence">("flow");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/psychometrics/mst-routing")
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
            <LayoutDashboard size={20} className="text-teal-400" />
            Multistage Test (MST) Routing Analytics
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Module routing distribution, θ convergence, and routing accuracy (Yan et al., 2014)
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
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "Total Sessions", value: data.totalSessions.toLocaleString(), color: "text-teal-400" },
            { label: "MST Sessions", value: data.mstEnabledSessions.toString(), color: "text-teal-400" },
            { label: "Mean Modules", value: data.meanModules.toFixed(1), color: "text-blue-400" },
            { label: "Mean Items/Session", value: data.meanItemsPerSession.toFixed(1), color: "text-emerald-400" },
            { label: "Completion Rate", value: `${(data.completionRate * 100).toFixed(1)}%`, color: "text-emerald-400" },
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

      {/* Routing thresholds banner */}
      {data && data.mstEnabledSessions > 0 && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2 flex gap-6 text-xs text-slate-400">
          <span>Routing thresholds:</span>
          <span className="text-blue-400">Low track: θ &lt; {data.routingThresholds.lowMax}</span>
          <span className="text-emerald-400">Mid track: {data.routingThresholds.lowMax} ≤ θ &lt; {data.routingThresholds.midMax}</span>
          <span className="text-amber-400">High track: θ ≥ {data.routingThresholds.midMax}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {(["flow", "routes", "convergence"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-teal-700 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}
          >
            {t === "flow" ? "Routing Flow" : t === "routes" ? "Route Details" : "θ Convergence"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="load" className="flex justify-center py-16 text-slate-500 text-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            Analysing MST routing…
          </motion.div>
        ) : data && data.mstEnabledSessions === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800 border border-slate-700 rounded-xl p-10 text-center">
            <BarChart3 size={36} className="mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400 text-sm">No MST sessions found. Enable MST routing in system configuration to see data here.</p>
          </motion.div>
        ) : data && tab === "flow" ? (
          <motion.div key="flow" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <RouteFlowDiagram routeStats={data.routeStats} total={data.mstEnabledSessions} />
          </motion.div>
        ) : data && tab === "routes" ? (
          <motion.div key="routes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {data.routeStats.map((rs) => (
              <div key={rs.route} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  {routeBadge(rs.route)}
                  <span className="text-white font-semibold text-sm">
                    {rs.count} sessions ({rs.pct.toFixed(1)}%)
                  </span>
                  <span className="ml-auto text-slate-400 text-xs">
                    θ̄ = {rs.meanTheta.toFixed(3)} | SEM̄ = {rs.meanSEM.toFixed(3)} | Items̄ = {rs.meanItems.toFixed(1)}
                  </span>
                </div>
                {/* CEFR distribution mini-bar */}
                <div className="flex gap-1 h-4">
                  {rs.cefrDistribution
                    .sort((a, b) => b.count - a.count)
                    .map((c) => (
                      <div
                        key={c.cefrLevel}
                        className="rounded-sm flex items-center justify-center text-[8px] text-white font-bold overflow-hidden"
                        style={{
                          backgroundColor: CEFR_BG[c.cefrLevel] ?? "#475569",
                          flex: c.count,
                          minWidth: c.count > 0 ? "20px" : "0px",
                        }}
                        title={`${c.cefrLevel}: ${c.count}`}
                      >
                        {c.cefrLevel.replace("_", "")}
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </motion.div>
        ) : data && tab === "convergence" ? (
          <motion.div key="convergence" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-1">Mean θ by Stage (± 1 SD)</h3>
            <p className="text-slate-500 text-xs mb-4">Shows how ability estimates evolve across MST stages. Converging lines indicate accurate routing.</p>
            {data.stageTheta.length < 2 ? (
              <p className="text-slate-500 text-sm">Insufficient stage data to plot convergence.</p>
            ) : (
              <ThetaByStage stages={data.stageTheta} />
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
